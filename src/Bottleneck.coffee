NUM_PRIORITIES = 10
DEFAULT_PRIORITY = 5
parser = require "./parser"
Local = require "./Local"
RedisStorage = require "./RedisStorage"
DLList = require "./DLList"
Sync = require "./Sync"
packagejson = require "../package.json"
class Bottleneck
  Bottleneck.default = Bottleneck
  Bottleneck.version = Bottleneck::version = packagejson.version
  Bottleneck.strategy = Bottleneck::strategy = { LEAK:1, OVERFLOW:2, OVERFLOW_PRIORITY:4, BLOCK:3 }
  Bottleneck.BottleneckError = Bottleneck::BottleneckError = require "./BottleneckError"
  Bottleneck.Group = Bottleneck::Group = require "./Group"
  jobDefaults:
    priority: DEFAULT_PRIORITY,
    weight: 1,
    expiration: null,
    id: "<no-id>"
  storeDefaults:
    maxConcurrent: null,
    minTime: 0,
    highWater: null,
    strategy: Bottleneck::strategy.LEAK,
    penalty: null,
    reservoir: null,
  storeInstanceDefaults:
    clientOptions: {},
    clearDatastore: false,
    Promise: Promise
  instanceDefaults:
    datastore: "local",
    id: "<no-id>",
    rejectOnDrop: true,
    Promise: Promise
  constructor: (options={}, invalid...) ->
    unless options? and typeof options == "object" and invalid.length == 0
      throw new Bottleneck::BottleneckError "Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1."
    parser.load options, @instanceDefaults, @
    @_queues = @_makeQueues()
    @_executing = {}
    @_limiter = null
    @_events = {}
    @_submitLock = new Sync("submit")
    @_registerLock = new Sync("register")
    sDefaults = parser.load options, @storeDefaults, {}
    @_store = if @datastore == "local" then new Local parser.load options, @storeInstanceDefaults, sDefaults
    else if @datastore == "redis" then new RedisStorage @, sDefaults, parser.load options, @storeInstanceDefaults, {}
    else throw new Bottleneck::BottleneckError "Invalid datastore type: #{@datastore}"
  ready: => @_store.ready
  clients: => @_store.clients
  disconnect: (flush=true) => await @_store.disconnect flush
  _addListener: (name, status, cb) ->
    @_events[name] ?= []
    @_events[name].push {cb, status}
    @
  _trigger: (name, args) ->
    if name != "debug" then @_trigger "debug", ["Event triggered: #{name}", args]
    if name == "dropped" and @rejectOnDrop
      args.forEach (job) -> job.cb.apply {}, [new Bottleneck::BottleneckError("This job has been dropped by Bottleneck")]
    return unless @_events[name]?
    @_events[name] = @_events[name].filter (listener) -> listener.status != "none"
    @_events[name].forEach (listener) ->
      return if listener.status == "none"
      if listener.status == "once" then listener.status = "none"
      listener.cb.apply {}, args
  _makeQueues: -> new DLList() for i in [1..NUM_PRIORITIES]
  chain: (@_limiter) => @
  _sanitizePriority: (priority) ->
    sProperty = if ~~priority != priority then DEFAULT_PRIORITY else priority
    if sProperty < 0 then 0 else if sProperty > NUM_PRIORITIES-1 then NUM_PRIORITIES-1 else sProperty
  _find: (arr, fn) -> (do -> for x, i in arr then if fn x then return x) ? []
  queued: (priority) => if priority? then @_queues[priority].length else @_queues.reduce ((a, b) -> a+b.length), 0
  running: => await @_store.__running__()
  _getFirst: (arr) -> @_find arr, (x) -> x.length > 0
  _randomIndex: -> Math.random().toString(36).slice(2)
  check: (weight=1) => await @_store.__check__ weight
  _run: (next, wait, index) ->
    @_trigger "debug", ["Scheduling #{next.options.id}", { args: next.args, options: next.options }]
    done = false
    completed = (args...) =>
      if not done
        try
          done = true
          clearTimeout @_executing[index].expiration
          delete @_executing[index]
          @_trigger "debug", ["Completed #{next.options.id}", { args: next.args, options: next.options }]
          { running } = await @_store.__free__ index, next.options.weight
          @_trigger "debug", ["Freed #{next.options.id}", { args: next.args, options: next.options }]
          @_drainAll().catch (e) => @_trigger "error", [e]
          if running == 0 and @queued() == 0 then @_trigger "idle", []
          next.cb?.apply {}, args
        catch e
          @_trigger "error", [e]
    @_executing[index] =
      timeout: setTimeout =>
        @_trigger "debug", ["Executing #{next.options.id}", { args: next.args, options: next.options }]
        if @_limiter? then @_limiter.submit.apply @_limiter, Array::concat next.options, next.task, next.args, completed
        else next.task.apply {}, next.args.concat completed
      , wait
      expiration: if next.options.expiration? then setTimeout =>
        completed new Bottleneck::BottleneckError "This job timed out after #{next.options.expiration} ms."
      , next.options.expiration
      job: next
  _drainOne: (freed) =>
    @_registerLock.schedule =>
      if @queued() == 0 then return @Promise.resolve false
      queue = @_getFirst @_queues
      { options, args } = queue.first()
      if freed? and options.weight > freed then return @Promise.resolve false
      @_trigger "debug", ["Draining #{options.id}", { args, options }]
      index = @_randomIndex()
      @_store.__register__ index, options.weight, options.expiration
      .then ({ success, wait }) =>
        @_trigger "debug", ["Drained #{options.id}", { success, args, options }]
        if success
          next = queue.shift()
          if @queued() == 0 and @_submitLock._queue.length == 0 then @_trigger "empty", []
          @_run next, wait, index
        @Promise.resolve success
  _drainAll: (freed) ->
    @_drainOne(freed)
    .then (success) =>
      if success then @_drainAll()
      else @Promise.resolve success
    .catch (e) => @_trigger "error", [e]
  submit: (args...) =>
    if typeof args[0] == "function"
      [task, args..., cb] = args
      options = @jobDefaults
    else
      [options, task, args..., cb] = args
      options = parser.load options, @jobDefaults
    job = { options, task, args, cb }
    options.priority = @_sanitizePriority options.priority

    @_trigger "debug", ["Queueing #{options.id}", { args, options }]
    @_submitLock.schedule =>
      try
        { reachedHWM, blocked, strategy } = await @_store.__submit__ @queued(), options.weight
        @_trigger "debug", ["Queued #{options.id}", { args, options, reachedHWM, blocked }]
      catch e
        @_trigger "debug", ["Could not queue #{options.id}", { args, options, error: e }]
        job.cb e
        return false

      if blocked
        @_queues = @_makeQueues()
        @_trigger "dropped", [job]
        return true
      else if reachedHWM
        shifted = if strategy == Bottleneck::strategy.LEAK then @_getFirst(@_queues[options.priority..].reverse()).shift()
        else if strategy == Bottleneck::strategy.OVERFLOW_PRIORITY then @_getFirst(@_queues[(options.priority+1)..].reverse()).shift()
        else if strategy == Bottleneck::strategy.OVERFLOW then job
        if shifted? then @_trigger "dropped", [shifted]
        if not shifted? or strategy == Bottleneck::strategy.OVERFLOW then return reachedHWM
      @_queues[options.priority].push job
      await @_drainAll()
      reachedHWM
  schedule: (args...) =>
    if typeof args[0] == "function"
      [task, args...] = args
      options = @jobDefaults
    else
      [options, task, args...] = args
      options = parser.load options, @jobDefaults
    wrapped = (args..., cb) ->
      (task.apply {}, args)
      .then (args...) -> cb.apply {}, Array::concat null, args
      .catch (args...) -> cb.apply {}, args
    new @Promise (resolve, reject) =>
      @submit.apply {}, Array::concat options, wrapped, args, (args...) ->
        (if args[0]? then reject else args.shift(); resolve).apply {}, args
      .catch (e) => @_trigger "error", [e]
  wrap: (fn) => (args...) => @schedule.apply {}, Array::concat fn, args
  updateSettings: (options={}) =>
    await @_store.__updateSettings__ parser.overwrite options, @storeDefaults
    parser.overwrite options, @instanceDefaults, @
    @_drainAll().catch (e) => @_trigger "error", [e]
    @
  currentReservoir: => await @_store.__currentReservoir__()
  incrementReservoir: (incr=0) =>
    await @_store.__incrementReservoir__ incr
    @_drainAll().catch (e) => @_trigger "error", [e]
    @
  on: (name, cb) => @_addListener name, "many", cb
  once: (name, cb) => @_addListener name, "once", cb
  removeAllListeners: (name=null) =>
    if name? then delete @_events[name] else @_events = {}
    @

module.exports = Bottleneck
