Scripts = require "./Scripts"

class RedisConnection
  constructor: (@clientOptions, @Promise, @Events) ->
    Redis = eval("require")("redis") # Obfuscated or else Webpack/Angular will try to inline the optional redis module
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
      @subClient.on "subscribe", =>
        @pubsubs[instance._channel()] = pubsub
        resolve()
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
