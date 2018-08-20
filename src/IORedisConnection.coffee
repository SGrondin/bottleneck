Scripts = require "./Scripts"

class IORedisConnection
  constructor: (@clientOptions, @Promise, @Events) ->
    Redis = eval("require")("ioredis") # Obfuscated or else Webpack/Angular will try to inline the optional ioredis module
    @client = new Redis @clientOptions
    @subClient = new Redis @clientOptions
    @pubsubs = {}

    @ready = new @Promise (resolve, reject) =>
      errorListener = (e) =>
        [@client, @subClient].forEach (client) =>
          client.removeListener "error", errorListener
        reject e
      count = 0
      done = =>
        count++
        if count == 2
          [@client, @subClient].forEach (client) =>
            client.removeListener "error", errorListener
            client.on "error", (e) => @Events.trigger "error", [e]
          resolve({ client: @client, subscriber: @subClient })
      @client.on "error", errorListener
      @client.on "ready", -> done()
      @subClient.on "error", errorListener
      @subClient.on "ready", =>
        @subClient.psubscribe "bottleneck_*", -> done()
      @subClient.on "pmessage", (pattern, channel, message) =>
        @pubsubs[channel]?(message)

    .then => Scripts.names.forEach (name) => @client.defineCommand name, { lua: Scripts.payload(name) }
    .then => @Promise.resolve { client: @client, subscriber: @subClient }

  addLimiter: (instance, pubsub) ->
    @pubsubs["bottleneck_#{instance.id}"] = pubsub

  removeLimiter: (instance) ->
    delete @pubsubs["bottleneck_#{instance.id}"]

  scriptArgs: (name, id, args, cb) ->
    keys = Scripts.keys name, id
    [keys.length].concat keys, args, cb

  scriptFn: (name) ->
    @client[name].bind(@client)

  disconnect: (flush) ->
    @client.end(flush)
    @subClient.end(flush)

module.exports = IORedisConnection
