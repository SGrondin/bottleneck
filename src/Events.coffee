BottleneckError = require "./BottleneckError"
class Events
  constructor: (@instance) ->
    @_events = {}
    @instance.on = (name, cb) => @_addListener name, "many", cb
    @instance.once = (name, cb) => @_addListener name, "once", cb
    @instance.removeAllListeners = (name=null) =>
      if name? then delete @_events[name] else @_events = {}
  _addListener: (name, status, cb) ->
    @_events[name] ?= []
    @_events[name].push {cb, status}
  trigger: (name, args) ->
    if name != "debug" then @trigger "debug", ["Event triggered: #{name}", args]
    if name == "dropped" and @instance.rejectOnDrop
      args.forEach (job) -> job.cb.apply {}, [new BottleneckError("This job has been dropped by Bottleneck")]
    return unless @_events[name]?
    @_events[name] = @_events[name].filter (listener) -> listener.status != "none"
    @_events[name].forEach (listener) =>
      return if listener.status == "none"
      if listener.status == "once" then listener.status = "none"
      try
        ret = listener.cb.apply {}, args
        if typeof ret?.then == "function"
          ret.then(->).catch((e) => @trigger "error", [e])
      catch e
        if "name" != "error" then @trigger "error", [e]

module.exports = Events
