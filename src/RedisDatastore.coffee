parser = require "./parser"
BottleneckError = require "./BottleneckError"
RedisConnection = require "./RedisConnection"
IORedisConnection = require "./IORedisConnection"

class RedisDatastore
  constructor: (@instance, @initSettings, options) ->
    @originalId = @instance.id
    parser.load options, options, @
    @isReady = false

    @connection = if @_groupConnection then @_groupConnection
    else if @instance.datastore == "redis" then new RedisConnection @clientOptions, @Promise, @instance.Events
    else if @instance.datastore == "ioredis" then new IORedisConnection @clusterNodes, @clientOptions, @Promise, @instance.Events

    @ready = @connection.ready
    .then (@clients) =>
      args = @prepareInitSettings @clearDatastore
      @isReady = true
      @runScript "init", args
    .then =>
      @connection.addLimiter @instance, (message) =>
        [type, info] = message.split ":"
        if type == "freed" then @instance._drainAll ~~info
      @clients

  __disconnect__: (flush) ->
    @connection.removeLimiter @instance
    if !@_groupConnection?
      @connection.disconnect flush

  runScript: (name, args) ->
    if !@isReady then @Promise.reject new BottleneckError "This limiter is not done connecting to Redis yet. Wait for the '.ready()' promise to resolve before submitting requests."
    else
      new @Promise (resolve, reject) =>
        @instance.Events.trigger "debug", ["Calling Redis script: #{name}.lua", args]
        arr = @connection.scriptArgs name, @originalId, args, (err, replies) ->
          if err? then return reject err
          return resolve replies
        @connection.scriptFn(name).apply {}, arr
      .catch (e) =>
        if e.message == "SETTINGS_KEY_NOT_FOUND"
        then @runScript("init", @prepareInitSettings(false)).then => @runScript(name, args)
        else @Promise.reject e

  prepareArray: (arr) -> arr.map (x) -> if x? then x.toString() else ""

  prepareObject: (obj) ->
    arr = []
    for k, v of obj then arr.push k, (if v? then v.toString() else "")
    arr

  prepareInitSettings: (clear) ->
    args = @prepareObject Object.assign({}, @initSettings, {
      id: @originalId,
      nextRequest: Date.now(),
      running: 0,
      unblockTime: 0,
      version: @instance.version,
      groupTimeout: @timeout
    })
    args.unshift (if clear then 1 else 0)
    args

  convertBool: (b) -> !!b

  __updateSettings__: (options) -> await @runScript "update_settings", @prepareObject options

  __running__: -> await @runScript "running", [Date.now()]

  __groupCheck__: -> @convertBool await @runScript "group_check", []

  __incrementReservoir__: (incr) -> await @runScript "increment_reservoir", [incr]

  __currentReservoir__: -> await @runScript "current_reservoir", []

  __check__: (weight) -> @convertBool await @runScript "check", @prepareArray [weight, Date.now()]

  __register__: (index, weight, expiration) ->
    [success, wait, reservoir] = await @runScript "register", @prepareArray [index, weight, expiration, Date.now()]
    return {
      success: @convertBool(success),
      wait,
      reservoir
    }

  __submit__: (queueLength, weight) ->
    try
      [reachedHWM, blocked, strategy] = await @runScript "submit", @prepareArray [queueLength, weight, Date.now()]
      return {
        reachedHWM: @convertBool(reachedHWM),
        blocked: @convertBool(blocked),
        strategy
      }
    catch e
      if e.message.indexOf("OVERWEIGHT") == 0
        [overweight, weight, maxConcurrent] = e.message.split ":"
        throw new BottleneckError("Impossible to add a job having a weight of #{weight} to a limiter having a maxConcurrent setting of #{maxConcurrent}")
      else
        throw e

  __free__: (index, weight) ->
    result = await @runScript "free", @prepareArray [index, Date.now()]
    return { running: result }

module.exports = RedisDatastore
