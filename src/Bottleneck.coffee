NB_PRIORITIES = 10
MIDDLE_PRIORITY = 5
parser = require "./parser"
DLList = require "./DLList"
class Bottleneck
	Bottleneck.default = Bottleneck
	Bottleneck.strategy = Bottleneck::strategy = {LEAK:1, OVERFLOW:2, OVERFLOW_PRIORITY:4, BLOCK:3}
	Bottleneck.BottleneckError = Bottleneck::BottleneckError = require "./BottleneckError"
	Bottleneck.Cluster = Bottleneck::Cluster = require "./Cluster"
	defaults: {
		maxConcurrent: 0,
		minTime: 0,
		highWater: -1,
		strategy: Bottleneck::strategy.LEAK,
		rejectOnDrop: true,
		reservoir: null,
		interrupt: false,
		Promise: Promise
	}
	jobDefaults: {
		priority: MIDDLE_PRIORITY
	}
	constructor: (options={}) ->
		parser.load options, @defaults, @
		@_nextRequest = Date.now()
		@_running = 0
		@_queues = @_makeQueues()
		@_executing = {}
		@_nextIndex = 0
		@_unblockTime = 0
		@penalty = options.penalty ? ((15 * @minTime) or 5000)
		@_limiter = null
		@_events = {}
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
	isBlocked: -> @_unblockTime >= Date.now()
	_sanitizePriority: (priority) ->
		sProperty = if ~~priority != priority then MIDDLE_PRIORITY else priority
		if sProperty < 0 then 0 else if sProperty > NB_PRIORITIES-1 then NB_PRIORITIES-1 else sProperty
	_find: (arr, fn) -> (do -> for x, i in arr then if fn x then return x) ? []
	queued: (priority) -> if priority? then @_queues[@_sanitizePriority priority].length else @_queues.reduce ((a, b) -> a+b.length), 0
	running: () -> @_running
	_getFirst: (arr) -> @_find arr, (x) -> x.length > 0
	_conditionsCheck: -> (@running() < @maxConcurrent or @maxConcurrent <= 0) and (not @reservoir? or @reservoir > 0)
	check: -> @_conditionsCheck() and (@_nextRequest-Date.now()) <= 0
	_tryToRun: ->
		if @_conditionsCheck() and (queued = @queued()) > 0
			@_running++
			if @reservoir? then @reservoir--
			wait = Math.max @_nextRequest-Date.now(), 0
			@_nextRequest = Date.now() + wait + @minTime
			next = (@_getFirst @_queues).shift()
			if queued == 1 then @_trigger "empty", []
			done = false
			index = @_nextIndex++
			@_executing[index] =
				timeout: setTimeout =>
					completed = (args...) =>
						if not done
							done = true
							delete @_executing[index]
							@_running--
							@_tryToRun()
							if @running() == 0 and @queued() == 0 then @_trigger "idle", []
							if not @interrupt then next.cb?.apply {}, args
					if @_limiter? then @_limiter.submit.apply @_limiter, Array::concat next.task, next.args, completed
					else next.task.apply {}, next.args.concat completed
				, wait
				job: next
			true
		else false
	submit: (args...) =>
		if typeof args[0] == "function"
			[task, args..., cb] = args
			options = @jobDefaults
		else
			[options, task, args..., cb] = args
			options = parser.load options, @jobDefaults

		job = {task, args, cb}
		options.priority = @_sanitizePriority options.priority
		reachedHighWaterMark = @highWater >= 0 and @queued() == @highWater and not @check()
		if @strategy == Bottleneck::strategy.BLOCK and (reachedHighWaterMark or @isBlocked())
			@_unblockTime = Date.now() + @penalty
			@_nextRequest = @_unblockTime + @minTime
			@_queues = @_makeQueues()
			@_trigger "dropped", [job]
			return true
		else if reachedHighWaterMark
			shifted = if @strategy == Bottleneck::strategy.LEAK then (@_getFirst @_queues[options.priority..].reverse()).shift()
			else if @strategy == Bottleneck::strategy.OVERFLOW_PRIORITY then (@_getFirst @_queues[(options.priority+1)..].reverse()).shift()
			else if @strategy == Bottleneck::strategy.OVERFLOW then job
			if shifted? then @_trigger "dropped", [shifted]
			if not shifted? or @strategy == Bottleneck::strategy.OVERFLOW then return reachedHighWaterMark
		@_queues[options.priority].push job
		@_tryToRun()
		reachedHighWaterMark
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
	wrap: (fn) -> (args...) => @schedule.apply {}, Array::concat fn, args
	updateSettings: (options={}) ->
		parser.overwrite options, @defaults, @
		while @_tryToRun() then
		@
	incrementReservoir: (incr=0) ->
		@updateSettings {reservoir: @reservoir + incr}
		@
	on: (name, cb) ->
		@_events[name] ?= []
		@_events[name].push {cb, status: "many"}
		@
	once: (name, cb) ->
		@_events[name] ?= []
		@_events[name].push {cb, status: "once"}
		@
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
		while job = (@_getFirst @_queues).shift() then @_trigger "dropped", [job]
		@_trigger "empty", []
		if @running() == 0 then @_trigger "idle", []
		@

module.exports = Bottleneck
