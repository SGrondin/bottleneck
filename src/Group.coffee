parser = require "./parser"
Events = require "./Events"
RedisConnection = require "./RedisConnection"
IORedisConnection = require "./IORedisConnection"

class Group
  defaults: { timeout: 1000 * 60 * 5 }

  constructor: (@limiterOptions={}) ->
    parser.load @limiterOptions, @defaults, @
    @Events = new Events @
    @instances = {}
    @Bottleneck = require "./Bottleneck"
    @_startAutoCleanup()
    if @limiterOptions.datastore == "redis"
      @_connection = new RedisConnection (@limiterOptions.clientOptions ? {}), (@limiterOptions.Promise ? Promise), @Events
    else if @limiterOptions.datastore == "ioredis"
      @_connection = new IORedisConnection (@limiterOptions.clusterNodes ? null), (@limiterOptions.clientOptions ? {}), (@limiterOptions.Promise ? Promise), @Events

  key: (key="") => @instances[key] ? do =>
    limiter = @instances[key] = new @Bottleneck Object.assign @limiterOptions, {
      id: "group-key-#{key}",
      timeout: @timeout,
      _groupConnection: @_connection
    }
    @Events.trigger "created", [limiter, key]
    limiter

  deleteKey: (key="") =>
    @instances[key]?.disconnect()
    delete @instances[key]

  limiters: =>
    for k, v of @instances then { key: k, limiter: v }

  keys: => Object.keys @instances

  _startAutoCleanup: =>
    clearInterval @interval
    (@interval = setInterval =>
      time = Date.now()
      for k, v of @instances
        try if await v._store.__groupCheck__(time) then @deleteKey k
        catch e then v.Events.trigger "error", [e]
    , (@timeout / 2)).unref?()

  updateSettings: (options={}) =>
    parser.overwrite options, @defaults, @
    parser.overwrite options, options, @limiterOptions
    @_startAutoCleanup() if options.timeout?

  disconnect: (flush) ->
    @_connection?.disconnect(flush)

module.exports = Group
