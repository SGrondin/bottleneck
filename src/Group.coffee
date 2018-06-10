parser = require "./parser"
Events = require "./Events"
class Group
  defaults: { timeout: 1000 * 60 * 5 }
  constructor: (@limiterOptions={}, groupOptions={}) ->
    parser.load groupOptions, @defaults, @
    @Events = new Events @
    @instances = {}
    @Bottleneck = require "./Bottleneck"
    @_startAutoCleanup()
  key: (key="") => @instances[key] ? do =>
    limiter = @instances[key] = new @Bottleneck Object.assign @limiterOptions, { id: "group-key-#{key}", _groupTimeout: @timeout }
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
    @_startAutoCleanup() if options.timeout?

module.exports = Group
