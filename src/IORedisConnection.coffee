parser = require "./parser"
Events = require "./Events"
Scripts = require "./Scripts"

class IORedisConnection
  defaults:
    clientOptions: {}
    clusterNodes: null
    Promise: Promise
    Events: null

  constructor: (options) ->
    Redis = eval("require")("ioredis") # Obfuscated or else Webpack/Angular will try to inline the optional ioredis module
    parser.load options, @defaults, @
    @Events ?= new Events @

    if @clusterNodes?
      @client = new Redis.Cluster @clusterNodes, @clientOptions
      @subClient = new Redis.Cluster @clusterNodes, @clientOptions
    else
      @client = new Redis @clientOptions
      @subClient = new Redis @clientOptions
    @limiters = {}

    @ready = new @Promise (resolve, reject) =>
      count = 0
      errorListener = (e) => @Events.trigger "error", [e]
      done = => if ++count == 2 then resolve { client: @client, subscriber: @subClient }
      @client.on "error", errorListener
      @client.once "ready", done
      @subClient.on "error", errorListener
      @subClient.once "ready", done
      @subClient.on "message", (channel, message) =>
        @limiters[channel]?._store.onMessage message

  loadScripts: -> Scripts.names.forEach (name) => @client.defineCommand name, { lua: Scripts.payload(name) }

  addLimiter: (instance) ->
    new instance.Promise (resolve, reject) =>
      @subClient.subscribe instance._channel(), =>
        @limiters[instance._channel()] = instance
        resolve()

  removeLimiter: (instance) ->
    delete @limiters[instance._channel()]

  scriptArgs: (name, id, args, cb) ->
    keys = Scripts.keys name, id
    [keys.length].concat keys, args, cb

  scriptFn: (name) ->
    @client[name].bind(@client)

  disconnect: (flush) ->
    @limiters[k]._store.__disconnect__(flush) for k in Object.keys @limiters
    if flush
      @Promise.all [@client.quit(), @subClient.quit()]
    else
      @client.disconnect()
      @subClient.disconnect()
      @Promise.resolve()

module.exports = IORedisConnection
