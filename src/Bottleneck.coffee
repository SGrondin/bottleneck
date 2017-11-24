NB_PRIORITIES = 10
MIDDLE_PRIORITY = 5
parser = require "./parser"
Local = require "./Local"
DLList = require "./DLList"
class Bottleneck
  Bottleneck.default = Bottleneck
  Bottleneck.strategy = Bottleneck::strategy = { LEAK:1, OVERFLOW:2, OVERFLOW_PRIORITY:4, BLOCK:3 }
  Bottleneck.BottleneckError = Bottleneck::BottleneckError = require "./BottleneckError"
  Bottleneck.Cluster = Bottleneck::Cluster = require "./Cluster"
  jobDefaults: { priority: MIDDLE_PRIORITY, weight: 1, id: "<none>" }
  storeDefaults: {
    maxConcurrent: null,
    minTime: 0,
    highWater: null,
    strategy: Bottleneck::strategy.LEAK,
    penalty: null,
    reservoir: null
  }
  instanceDefaults: {
    rejectOnDrop: true,
    interrupt: false,
    Promise: Promise
  }
  constructor: (options={}, invalid...) ->
    unless options? and typeof options == "object" and invalid.length == 0
      throw new Bottleneck::BottleneckError "Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-from-v1 if you're upgrading from Bottleneck v1."
    parser.load options, @instanceDefaults, @
    @_queues = @_makeQueues()
    @_executing = {}
    @_nextIndex = 0
    @_limiter = null
    @_events = {}
    @_store = new Local parser.load options, @storeDefaults, {}
  _addListener: (name, status, cb) ->
    @_events[name] ?= []
    @_events[name].push {cb, status}
    @
  _trigger: (name, args) ->
    if @rejectOnDrop && name == "dropped"
      args.forEach (job) -> job.cb.apply {}, [new Bottleneck::BottleneckError("This job has been dropped by Bottleneck")]
    return unless @_events[name]?
    @_events[name] = @_events[name].filter (event) -> event.status != "none"
    setTimeout (=> @_events[name].forEach (event) ->
      return if event.status == "none"
      if event.status == "once" then event.status = "none"
      event.cb.apply {}, args
    ), 0
  _makeQueues: -> new DLList() for i in [1..NB_PRIORITIES]
  chain: (@_limiter) -> @
  _sanitizePriority: (priority) ->
    sProperty = if ~~priority != priority then MIDDLE_PRIORITY else priority
    if sProperty < 0 then 0 else if sProperty > NB_PRIORITIES-1 then NB_PRIORITIES-1 else sProperty
  _find: (arr, fn) -> (do -> for x, i in arr then if fn x then return x) ? []
  queued: (priority) -> if priority? then @_queues[priority].length else @_queues.reduce ((a, b) -> a+b.length), 0
  running: -> @_store.__running__()
  _getFirst: (arr) -> @_find arr, (x) -> x.length > 0
  check: (weight=1) -> @_store.__check__ weight
  currentReservoir: -> @_store.__currentReservoir__()
  _run: (queued, wait) ->
    next = @_getFirst(@_queues).shift()
    if queued == 1 then @_trigger "empty", []
    done = false
    index = @_nextIndex++
    @_executing[index] =
      timeout: setTimeout =>
        completed = (args...) =>
          if not done
            done = true
            delete @_executing[index]
            { running } = @_store.__free__ next.options.weight
            while @_tryToRun() then
            if running == 0 and @queued() == 0 then @_trigger "idle", []
            if not @interrupt then next.cb?.apply {}, args
        if @_limiter? then @_limiter.submit.apply @_limiter, Array::concat next.task, next.args, completed
        else next.task.apply {}, next.args.concat completed
      , wait
      job: next
  _tryToRun: ->
    if (queued = @queued()) == 0 then return false
    weight = @_getFirst(@_queues).first().options.weight
    { success, wait } = @_store.__register__ weight
    if success
      # Race condition: __register__ could come back out of order, pass the next job or synchronize
      @_run queued, wait
    success
  _loadJobOptions: (options) -> parser.load options, @jobDefaults
  submit: (args...) =>
    if typeof args[0] == "function"
      [task, args..., cb] = args
      options = @jobDefaults
    else
      [options, task, args..., cb] = args
      options = @_loadJobOptions options
    job = { options, task, args, cb }
    options.priority = @_sanitizePriority options.priority

    { reachedHighWaterMark, blocked, strategy } = @_store.__submit__ @queued(), options.weight

    if blocked
      @_queues = @_makeQueues()
      @_trigger "dropped", [job]
      return true
    else if reachedHighWaterMark
      shifted = if strategy == Bottleneck::strategy.LEAK then @_getFirst(@_queues[options.priority..].reverse()).shift()
      else if strategy == Bottleneck::strategy.OVERFLOW_PRIORITY then @_getFirst(@_queues[(options.priority+1)..].reverse()).shift()
      else if strategy == Bottleneck::strategy.OVERFLOW then job
      if shifted? then @_trigger "dropped", [shifted]
      if not shifted? or strategy == Bottleneck::strategy.OVERFLOW then return reachedHighWaterMark
    @_queues[options.priority].push job
    @_tryToRun()
    reachedHighWaterMark
  schedule: (args...) =>
    if typeof args[0] == "function"
      [task, args...] = args
      options = @jobDefaults
    else
      [options, task, args...] = args
      options = @_loadJobOptions options
    wrapped = (args..., cb) ->
      (task.apply {}, args)
      .then (args...) -> cb.apply {}, Array::concat null, args
      .catch (args...) -> cb.apply {}, args
    new @Promise (resolve, reject) =>
      @submit.apply {}, Array::concat options, wrapped, args, (args...) ->
        (if args[0]? then reject else args.shift(); resolve).apply {}, args
  wrap: (fn) -> (args...) => @schedule.apply {}, Array::concat fn, args
  updateSettings: (options={}) ->
    @_store.__updateSettings__ parser.overwrite options, @storeDefaults
    parser.overwrite options, @instanceDefaults, @
    while @_tryToRun() then
    @
  incrementReservoir: (incr=0) ->
    @_store.__incrementReservoir__ incr
    @
  on: (name, cb) -> @_addListener name, "many", cb
  once: (name, cb) -> @_addListener name, "once", cb
  removeAllListeners: (name=null) ->
    if name? then delete @_events[name] else @_events = {}
    @
  stopAll: (@interrupt=@interrupt) ->
    keys = Object.keys @_executing
    (clearTimeout @_executing[k].timeout for k in keys)
    @_tryToRun = ->
    @check = -> false
    @submit = (args..., cb) -> cb new Bottleneck::BottleneckError "This limiter is stopped"
    @schedule = -> @Promise.reject(new Bottleneck::BottleneckError "This limiter is stopped")
    if @interrupt then (@_trigger "dropped", [@_executing[k].job] for k in keys)
    while job = @_getFirst(@_queues).shift() then @_trigger "dropped", [job]
    @_trigger "empty", []
    if @running() == 0 then @_trigger "idle", []
    @

module.exports = Bottleneck
