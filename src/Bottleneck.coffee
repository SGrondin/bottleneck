NB_PRIORITIES = 10
MIDDLE_PRIORITY = 5
class Bottleneck
	Bottleneck.strategy = Bottleneck::strategy = {LEAK:1, OVERFLOW:2, OVERFLOW_PRIORITY:4, BLOCK:3}
	Bottleneck.Cluster = Bottleneck::Cluster = require "./Cluster"
	Bottleneck.DLList = Bottleneck::DLList = require "./DLList"
	Bottleneck.Promise = Bottleneck::Promise = try require "bluebird" catch e then Promise ? ->
		throw new Error "Bottleneck: install 'bluebird' or use Node 0.12 or higher for Promise support"
	constructor: (@maxNb=0, @minTime=0, @highWater=-1, @strategy=Bottleneck::strategy.LEAK) ->
		@_nextRequest = Date.now()
		@_nbRunning = 0
		@_queues = @_makeQueues()
		@_timeouts = []
		@_unblockTime = 0
		@penalty = (15 * @minTime) or 5000
		@interrupt = false
		@reservoir = null
		@limiter = null
		@events = {}
	_trigger: (name, args) -> setTimeout (=> @events[name]?.forEach (e) -> e.apply {}, args), 0
	_makeQueues: -> new Bottleneck::DLList() for i in [1..NB_PRIORITIES]
	chain: (@limiter) -> @
	isBlocked: -> @_unblockTime >= Date.now()
	_sanitizePriority: (priority) ->
		sProperty = if ~~priority != priority then MIDDLE_PRIORITY else priority
		if sProperty < 0 then 0 else if sProperty > NB_PRIORITIES-1 then NB_PRIORITIES-1 else sProperty
	_find: (arr, fn) -> (for x, i in arr then if fn x then return x); []
	nbQueued: (priority) -> if priority? then @_queues[@_sanitizePriority priority].length else @_queues.reduce ((a, b) -> a+b.length), 0
	_getFirst: (arr) -> @_find arr, (x) -> x.length > 0
	_conditionsCheck: -> (@_nbRunning < @maxNb or @maxNb <= 0) and (not @reservoir? or @reservoir > 0)
	check: -> @_conditionsCheck() and (@_nextRequest-Date.now()) <= 0
	_tryToRun: ->
		if @_conditionsCheck() and (queued = @nbQueued()) > 0
			@_nbRunning++
			if @reservoir? then @reservoir--
			wait = Math.max @_nextRequest-Date.now(), 0
			@_nextRequest = Date.now() + wait + @minTime
			next = (@_getFirst @_queues).shift()
			if queued == 1 then @_trigger 'empty', []
			done = false
			index = -1 + @_timeouts.push setTimeout =>
				completed = =>
					if not done
						done = true
						delete @_timeouts[index]
						@_nbRunning--
						@_tryToRun()
						if not @interrupt then next.cb?.apply {}, Array::slice.call arguments, 0
				if @limiter? then @limiter.submit.apply @limiter, Array::concat next.task, next.args, completed
				else next.task.apply {}, next.args.concat completed
			, wait
			true
		else false
	submit: (args...) => @submitPriority.apply {}, Array::concat MIDDLE_PRIORITY, args
	submitPriority: (priority, task, args..., cb) =>
		job = {task, args, cb}
		priority = @_sanitizePriority priority
		reachedHighWaterMark = @highWater >= 0 and @nbQueued() == @highWater and not @check()
		if @strategy == Bottleneck::strategy.BLOCK and (reachedHighWaterMark or @isBlocked())
			@_unblockTime = Date.now() + @penalty
			@_nextRequest = @_unblockTime + @minTime
			@_queues = @_makeQueues()
			@_trigger 'dropped', [job]
			return true
		else if reachedHighWaterMark
			shifted = if @strategy == Bottleneck::strategy.LEAK then (@_getFirst @_queues[priority..].reverse()).shift()
			else if @strategy == Bottleneck::strategy.OVERFLOW_PRIORITY then (@_getFirst @_queues[(priority+1)..].reverse()).shift()
			else if @strategy == Bottleneck::strategy.OVERFLOW then job
			if shifted? then @_trigger 'dropped', [shifted]
			if not shifted? or @strategy == Bottleneck::strategy.OVERFLOW then return reachedHighWaterMark
		@_queues[priority].push job
		@_tryToRun()
		reachedHighWaterMark
	schedule: (args...) -> @schedulePriority.apply {}, Array::concat MIDDLE_PRIORITY, args
	schedulePriority: (priority, task, args...) =>
		wrapped = (cb) ->
			(task.apply {}, args)
			.then (args...) -> cb.apply {}, Array::concat null, args
			.catch (args...) -> cb.apply {}, Array::concat {}, args
		new Bottleneck::Promise (resolve, reject) =>
			@submitPriority.apply {}, Array::concat priority, wrapped, (error, args...) ->
				(if error? then reject else resolve).apply {}, args
	changeSettings: (@maxNb=@maxNb, @minTime=@minTime, @highWater=@highWater, @strategy=@strategy) ->
		while @_tryToRun() then
		@
	changePenalty: (@penalty=@penalty) -> @
	changeReservoir: (@reservoir) ->
		while @_tryToRun() then
		@
	incrementReservoir: (incr=0) ->
		@changeReservoir @reservoir+incr
		@
	on: (name, cb) ->
		if @events[name]? then @events[name].push cb else @events[name] = [cb]
		@
	stopAll: (@interrupt=@interrupt) ->
		(clearTimeout a for a in @_timeouts)
		@_tryToRun = ->
		@check = @submit = @submitPriority = @schedule = @schedulePriority = -> false

module.exports = Bottleneck
