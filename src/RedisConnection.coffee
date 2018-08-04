class RedisConnection
  constructor: (@clientOptions, @Promise, @Events) ->
    redis = eval("require")("redis") # Obfuscated or else Webpack/Angular will try to inline the optional redis module
    @client = redis.createClient @clientOptions
    @subClient = redis.createClient @clientOptions
    @pubsubs = {}
    @loaded = false

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
        @subClient.on "psubscribe", -> done()
        @subClient.psubscribe "bottleneck_*"
      @subClient.on "pmessage", (pattern, channel, message) =>
        @pubsubs[channel]?(message)

  addLimiter: (instance, pubsub) ->
    @pubsubs["bottleneck_#{instance.id}"] = pubsub

  removeLimiter: (instance) ->
    delete @pubsubs["bottleneck_#{instance.id}"]

  disconnect: (flush) ->
    @client.end flush
    @subClient.end flush

module.exports = RedisConnection
