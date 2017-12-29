parser = require "./parser"
DLList = require "./DLList"
BottleneckError = require "./BottleneckError"

lua = require "./lua.json"
libraries =
  refresh_running: lua["refresh_running.lua"]
  conditions_check: lua["conditions_check.lua"]
scripts =
  init:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: []
    code: lua["init.lua"]
  update_settings:
    keys: ["b_settings"]
    libs: []
    code: lua["update_settings.lua"]
  running:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running"]
    code: lua["running.lua"]
  check:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
    code: lua["check.lua"]
  submit:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
    code: lua["submit.lua"]
  register:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
    code: lua["register.lua"]
  free:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running"]
    code: lua["free.lua"]
  current_reservoir:
    keys: ["b_settings"]
    libs: []
    code: lua["current_reservoir.lua"]
  increment_reservoir:
    keys: ["b_settings"]
    libs: []
    code: lua["increment_reservoir.lua"]

class RedisStorage
  constructor: (@instance, initSettings, options) ->
    redis = require "redis"
    parser.load options, options, @
    @client = redis.createClient @clientOptions
    @subClient = redis.createClient @clientOptions
    @shas = {}

    @clients = { client: @client, subscriber: @subClient }
    @ready = new @Promise (resolve, reject) =>
      errorListener = (e) -> reject e
      count = 0
      done = =>
        count++
        if count == 2
          [@client, @subClient].forEach (client) =>
            client.removeListener "error", errorListener
            client.on "error", (e) => @instance._trigger "error", [e]
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

      args = @prepareObject(initSettings)
      args.unshift (if options.clearDatastore then 1 else 0)
      @runScript "init", args
    .then (results) =>
      @clients

  disconnect: (flush) ->
    @client.end flush
    @subClient.end flush
    @

  loadScript: (name) ->
    new @Promise (resolve, reject) =>
      payload = scripts[name].libs.map (lib) -> libraries[lib]
      .join("\n") + scripts[name].code

      @client.multi([["script", "load", payload]]).exec (err, replies) =>
        if err? then return reject err
        @shas[name] = replies[0]
        return resolve replies[0]

  loadAll: => @Promise.all(for k, v of scripts then @loadScript k)

  prepareArray: (arr) -> arr.map (x) -> if x? then x.toString() else ""

  prepareObject: (obj) ->
    arr = []
    for k, v of obj then arr.push k, (if v? then v.toString() else "")
    arr

  runScript: (name, args) ->
    new @Promise (resolve, reject) =>
      script = scripts[name]
      arr = [@shas[name], script.keys.length].concat script.keys, args, (err, replies) ->
        if err? then return reject err
        return resolve replies
      @client.evalsha.bind(@client).apply {}, arr

  convertBool: (b) -> !!b

  __updateSettings__: (options) -> await @runScript "update_settings", @prepareObject options

  __running__: -> await @runScript "running", [Date.now()]

  __incrementReservoir__: (incr) -> await @runScript "increment_reservoir", [incr]

  __currentReservoir__: -> await @runScript "current_reservoir", []

  __check__: (weight) -> @convertBool await @runScript "check", @prepareArray [weight, Date.now()]

  __register__: (index, weight, expiration) ->
    [success, wait] = await @runScript "register", @prepareArray [index, weight, expiration, Date.now()]
    return {
      success: @convertBool(success),
      wait
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
