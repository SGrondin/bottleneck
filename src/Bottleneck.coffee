NB_PRIORITIES = 10
MIDDLE_PRIORITY = 5
class Bottleneck
	Bottleneck.strategy = Bottleneck::strategy = {LEAK:1, OVERFLOW:2, BLOCK:3}
	Bottleneck.Cluster = Bottleneck::Cluster = require "./Cluster"
	Bottleneck.Promise = Bottleneck::Promise = try require "bluebird" catch e then Promise ? ->
		throw new Error "Bottleneck: install 'bluebird' or use Node 0.12 or higher for Promise support"
	constructor: (@maxNb=0, @minTime=0, @highWater=0, @strategy=Bottleneck::strategy.LEAK) ->
		console.log "\n===== BETA =====\n"
		@_nextRequest = Date.now()
		@_nbRunning = 0
		@_queues = @_makeQueues()
		@_timeouts = []
		@_unblockTime = 0
		@penalty = (15 * @minTime) or 5000
		@interrupt = false
		@reservoir = null
		@limiter = null
	_makeQueues: -> [] for i in [1..NB_PRIORITIES]
	chain: (@limiter) -> @
	isBlocked: -> @_unblockTime >= Date.now()
	_find: (arr, fn) -> for x, i in arr then if fn x then return x
	_hasJobs: -> @_queues.some (x) -> x.length > 0
	_getNbJobs: -> @_queues.reduce ((a, b) -> a+b.length), 0
	_getFirst: (arr) -> @_find arr, (x) -> x.length > 0
	_conditionsCheck: -> (@_nbRunning < @maxNb or @maxNb <= 0) and (not @reservoir? or @reservoir > 0)
	check: -> @_conditionsCheck() and (@_nextRequest-Date.now()) <= 0
	_tryToRun: ->
		if @_conditionsCheck() and @_hasJobs()
			@_nbRunning++
			if @reservoir? then @reservoir--
			wait = Math.max @_nextRequest-Date.now(), 0
			@_nextRequest = Date.now() + wait + @minTime
			next = (@_getFirst @_queues).shift()
			done = false
			index = -1 + @_timeouts.push setTimeout =>
				completed = =>
					if not done
						done = true
						delete @_timeouts[index]
						@_nbRunning--
						@_tryToRun()
						if not @interrupt then next.cb?.apply {}, Array::slice.call arguments, 0
				if @limiter? then @limiter.submit.apply @limiter, Array::concat.call next.task, next.args, completed
				else next.task.apply {}, next.args.concat completed
			, wait
			true
		else false
	submit: (args...) => @submitPriority.apply {}, Array::concat MIDDLE_PRIORITY, args
	submitPriority: (priority, task, args..., cb) =>
		priority = Math.round priority
		priority = if priority < 0 then 0 else if priority > NB_PRIORITIES-1 then NB_PRIORITIES-1 else priority
		reachedHighWaterMark = @highWater > 0 and @_getNbJobs() == @highWater
		if @strategy == Bottleneck::strategy.BLOCK and (reachedHighWaterMark or @isBlocked())
			@_unblockTime = Date.now() + @penalty
			@_nextRequest = @_unblockTime + @minTime
			@_queues = @_makeQueues()
			return true
		else if reachedHighWaterMark
			if @strategy == Bottleneck::strategy.LEAK
				shifted = (@_getFirst @_queues[priority..].reverse()).shift()
				if not shifted? then return reachedHighWaterMark
			else if @strategy == Bottleneck::strategy.OVERFLOW
				shifted = (@_getFirst @_queues[priority+1..].reverse()).shift()
				if not shifted? then return reachedHighWaterMark
		@_queues[priority].push {task, args, cb}
		@_tryToRun()
		reachedHighWaterMark
	schedule: (task, args...) ->
		wrapped = (cb) ->
			(task.apply {}, args)
			.then (args...) -> cb.apply {}, Array::concat.call [], null, args
			.catch (args...) -> cb.apply {}, Array::concat.call {}, args
		new Bottleneck::Promise (resolve, reject) =>
			@submit.apply {}, Array::concat.call wrapped, (error, args...) ->
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
	stopAll: (@interrupt=@interrupt) ->
		(clearTimeout a for a in @_timeouts)
		@_tryToRun = ->
		@submit = -> false
		@check = -> false

module.exports = Bottleneck
