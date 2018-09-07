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
      errorListener = (e) => @Events.trigger "error", [e]
      count = 0
      done = =>
        count++
        if count == 2
          [@client, @subClient].forEach (c) => c.removeAllListeners "ready"
          resolve()
      @client.on "error", errorListener
      @client.on "ready", -> done()
      @subClient.on "error", errorListener
      @subClient.on "ready", -> done()
      @subClient.on "message", (channel, message) =>
        @pubsubs[channel]?(message)

    .then => @Promise.all(Scripts.names.map (k) => @_loadScript k)
    .then => @Promise.resolve { client: @client, subscriber: @subClient }

  _loadScript: (name) ->
    new @Promise (resolve, reject) =>
      payload = Scripts.payload name
      @client.multi([["script", "load", payload]]).exec (err, replies) =>
        if err? then return reject err
        @shas[name] = replies[0]
        return resolve replies[0]

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
