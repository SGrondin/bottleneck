parser = require "./parser"
Events = require "./Events"
class Group
  defaults: { timeout: 1000 * 60 * 5 }
  constructor: (@limiterOptions={}, groupOptions={}) ->
    parser.load groupOptions, @defaults, @
    @Events = new Events @
    @instances = {}
    @Bottleneck = require "./Bottleneck"
    @startAutoCleanup()
  key: (key="") => @instances[key] ? do =>
    limiter = @instances[key] = new @Bottleneck @limiterOptions
    @Events.trigger "created", [limiter, key]
    limiter
  deleteKey: (key="") =>
    @instances[key]?.disconnect()
    delete @instances[key]
  limiters: =>
    for k,v of @instances then { key: k, limiter: v }
  keys: => Object.keys @instances
  startAutoCleanup: =>
    @stopAutoCleanup()
    (@interval = setInterval =>
      time = Date.now()
      for k,v of @instances
        try
          check = await v._store.__groupCheck__()
          if (check + @timeout) < time then @deleteKey k
        catch e
          v._trigger "error", [e]
    , (@timeout / 2)).unref?()
  stopAutoCleanup: => clearInterval @interval
  updateSettings: (options={}) =>
    parser.overwrite options, @defaults, @
    @startAutoCleanup() if options.timeout?

module.exports = Group
