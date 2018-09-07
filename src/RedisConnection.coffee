parser = require "./parser"
Events = require "./Events"
Scripts = require "./Scripts"

class RedisConnection
  defaults:
    clientOptions: {}
    Promise: Promise
    Events: null

  constructor: (options) ->
    Redis = eval("require")("redis") # Obfuscated or else Webpack/Angular will try to inline the optional redis module
    parser.load options, @defaults, @
    @Events ?= new Events @

    @client = Redis.createClient @clientOptions
    @subClient = Redis.createClient @clientOptions
    @pubsubs = {}
    @shas = {}

    @ready = new @Promise (resolve, reject) =>
      count = 0
      errorListener = (e) => @Events.trigger "error", [e]
      done = => if ++count == 2 then resolve { client: @client, subscriber: @subClient }
      @client.on "error", errorListener
      @client.once "ready", done
      @subClient.on "error", errorListener
      @subClient.once "ready", done
      @subClient.on "message", (channel, message) => @pubsubs[channel]?(message)

  _loadScript: (name) ->
    new @Promise (resolve, reject) =>
      payload = Scripts.payload name
      @client.multi([["script", "load", payload]]).exec (err, replies) =>
        if err? then return reject err
        @shas[name] = replies[0]
        resolve replies[0]

  loadScripts: -> @Promise.all(Scripts.names.map (k) => @_loadScript k)

  addLimiter: (instance, pubsub) ->
    new instance.Promise (resolve, reject) =>
      handler = (channel) =>
        if channel == instance._channel()
          @subClient.removeListener "subscribe", handler
          @pubsubs[channel] = pubsub
          resolve()
      @subClient.on "subscribe", handler
      @subClient.subscribe instance._channel()

  removeLimiter: (instance) ->
    delete @pubsubs[instance._channel()]

  scriptArgs: (name, id, args, cb) ->
    keys = Scripts.keys name, id
    [@shas[name], keys.length].concat keys, args, cb

  scriptFn: (name) ->
    @client.evalsha.bind(@client)

  disconnect: (flush) ->
    @client.end flush
    @subClient.end flush
    @Promise.resolve()

module.exports = RedisConnection
