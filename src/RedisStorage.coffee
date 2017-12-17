parser = require "./parser"
DLList = require "./DLList"
BottleneckError = require "./BottleneckError"

fs = require "fs"
libraries = {}
scripts =
  init:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: []
  updateSettings:
    keys: ["b_settings"]
    libs: []
  running:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running"]
  check:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
  submit:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
  register:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running", "conditions_check"]
  free:
    keys: ["b_settings", "b_running", "b_executing"]
    libs: ["refresh_running"]
  current_reservoir:
    keys: ["b_settings"]
    libs: []
  increment_reservoir:
    keys: ["b_settings"]
    libs: []

# Runs as-is in Node, but it also gets preprocessed by brfs
# brfs looks for the pattern "fs.readFile [string], [function]", can't use variables here
fs.readFile "./src/redis/refresh_running.lua", (err, data) -> if err? then throw err else libraries["refresh_running"] = data.toString "utf8"
fs.readFile "./src/redis/conditions_check.lua", (err, data) -> if err? then throw err else libraries["conditions_check"] = data.toString "utf8"

fs.readFile "./src/redis/init.lua", (err, data) -> if err? then throw err else scripts["init"].code = data.toString "utf8"
fs.readFile "./src/redis/running.lua", (err, data) -> if err? then throw err else scripts["running"].code = data.toString "utf8"
fs.readFile "./src/redis/update_settings.lua", (err, data) -> if err? then throw err else scripts["updateSettings"].code = data.toString "utf8"
fs.readFile "./src/redis/check.lua", (err, data) -> if err? then throw err else scripts["check"].code = data.toString "utf8"
fs.readFile "./src/redis/submit.lua", (err, data) -> if err? then throw err else scripts["submit"].code = data.toString "utf8"
fs.readFile "./src/redis/register.lua", (err, data) -> if err? then throw err else scripts["register"].code = data.toString "utf8"
fs.readFile "./src/redis/free.lua", (err, data) -> if err? then throw err else scripts["free"].code = data.toString "utf8"
fs.readFile "./src/redis/current_reservoir.lua", (err, data) -> if err? then throw err else scripts["current_reservoir"].code = data.toString "utf8"
fs.readFile "./src/redis/increment_reservoir.lua", (err, data) -> if err? then throw err else scripts["increment_reservoir"].code = data.toString "utf8"

class RedisStorage
  constructor: (@instance, initSettings, options) ->
    redis = require "redis"
    parser.load options, options, @
    @client = redis.createClient @clientOptions
    @subClient = redis.createClient @clientOptions
    @shas = {}

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
      @client

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

  __updateSettings__: (options) -> await @runScript "updateSettings", @prepareObject options

  __running__: -> await @runScript "running", [Date.now()]

  __incrementReservoir__: (incr) -> await @runScript "increment_reservoir", [incr]

  __currentReservoir__: -> await @runScript "current_reservoir", @prepareArray []

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
        [overweight, weight, maxConcurrent] = e.message.split " "
        throw new BottleneckError("Impossible to add a job having a weight of #{weight} to a limiter having a maxConcurrent setting of #{maxConcurrent}")
      else
        throw e

  __free__: (index, weight) ->
    result = await @runScript "free", @prepareArray [index, Date.now()]
    return { running: result }

module.exports = RedisStorage
