parser = require "./parser"
DLList = require "./DLList"
BottleneckError = require "./BottleneckError"

lua = require "./lua.json"
libraries =
  get_time: lua["get_time.lua"]
  refresh_running: lua["refresh_running.lua"]
  conditions_check: lua["conditions_check.lua"]
  refresh_expiration: lua["refresh_expiration.lua"]
  validate_keys: lua["validate_keys.lua"]
scriptTemplates = (id) ->
  init:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["refresh_expiration"]
    code: lua["init.lua"]
  update_settings:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_expiration"]
    code: lua["update_settings.lua"]
  running:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_running"]
    code: lua["running.lua"]
  group_check:
    keys: ["b_#{id}_settings"]
    libs: []
    code: lua["group_check.lua"]
  check:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_running", "conditions_check"]
    code: lua["check.lua"]
  submit:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_running", "conditions_check", "refresh_expiration"]
    code: lua["submit.lua"]
  register:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_running", "conditions_check", "refresh_expiration"]
    code: lua["register.lua"]
  free:
    keys: ["b_#{id}_settings", "b_#{id}_running", "b_#{id}_executing"]
    libs: ["validate_keys", "refresh_running"]
    code: lua["free.lua"]
  current_reservoir:
    keys: ["b_#{id}_settings"]
    libs: ["validate_keys"]
    code: lua["current_reservoir.lua"]
  increment_reservoir:
    keys: ["b_#{id}_settings"]
    libs: ["validate_keys"]
    code: lua["increment_reservoir.lua"]

class RedisStorage
  constructor: (@instance, initSettings, options) ->
    r = require
    redis = r do -> ["r", "e", "d", "i", "s"].join("") # Obfuscated or else Webpack/Angular will try to inline the optional redis module
    @scripts = scriptTemplates @instance.id
    parser.load options, options, @
    @client = redis.createClient @clientOptions
    @subClient = redis.createClient @clientOptions
    @shas = {}

    @clients = { client: @client, subscriber: @subClient }
    @isReady = false
    @ready = new @Promise (resolve, reject) =>
      errorListener = (e) -> reject e
      count = 0
      done = =>
        count++
        if count == 2
          [@client, @subClient].forEach (client) =>
            client.removeListener "error", errorListener
            client.on "error", (e) => @instance.Events.trigger "error", [e]
          resolve()
      @client.on "error", errorListener
      @client.on "ready", -> done()
      @subClient.on "error", errorListener
      @subClient.on "ready", =>
        @subClient.on "subscribe", -> done()
        @subClient.subscribe "bottleneck"
    .then @loadAll
    .then =>
      @subClient.on "message", (channel, message) =>
        [type, info] = message.split ":"
        if type == "freed" then @instance._drainAll ~~info

      initSettings.nextRequest = Date.now()
      initSettings.running = 0
      initSettings.unblockTime = 0
      initSettings.version = @instance.version
      initSettings.groupTimeout = @_groupTimeout

      args = @prepareObject(initSettings)
      args.unshift (if options.clearDatastore then 1 else 0)
      @isReady = true
      @runScript "init", args
    .then (results) =>
      @clients

  disconnect: (flush) ->
    @client.end flush
    @subClient.end flush
    @

  loadScript: (name) ->
    new @Promise (resolve, reject) =>
      payload = @scripts[name].libs.map (lib) -> libraries[lib]
      .join("\n") + @scripts[name].code

      @client.multi([["script", "load", payload]]).exec (err, replies) =>
        if err? then return reject err
        @shas[name] = replies[0]
        return resolve replies[0]

  loadAll: => @Promise.all(for k, v of @scripts then @loadScript k)

  prepareArray: (arr) -> arr.map (x) -> if x? then x.toString() else ""

  prepareObject: (obj) ->
    arr = []
    for k, v of obj then arr.push k, (if v? then v.toString() else "")
    arr

  runScript: (name, args) ->
    if !@isReady then @Promise.reject new BottleneckError "This limiter is not done connecting to Redis yet. Wait for the 'ready' event to be triggered before submitting requests."
    else
      script = @scripts[name]
      new @Promise (resolve, reject) =>
        arr = [@shas[name], script.keys.length].concat script.keys, args, (err, replies) ->
          if err? then return reject err
          return resolve replies
        @instance.Events.trigger "debug", ["Calling Redis script: #{name}.lua", args]
        @client.evalsha.bind(@client).apply {}, arr
      .catch (e) =>
        if e.message == "SETTINGS_KEY_NOT_FOUND"
        then @Promise.reject new BottleneckError "Bottleneck limiter (id: '#{@instance.id}') could not find the Redis key it needs to complete this action (key '#{script.keys[0]}'), was it deleted?#{if @_groupTimeout? then ' Note: This limiter is in a Group, it could have been garbage collected.' else ''}"
        else @Promise.reject e

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

module.exports = RedisStorage
