class Bottleneck
	Bottleneck.strategy = Bottleneck::strategy = {LEAK:1, OVERFLOW:2, BLOCK:3}
	Bottleneck.Cluster = Bottleneck::Cluster = require "./Cluster"
	Bottleneck.Promise = Bottleneck::Promise = try require "bluebird" catch e then Promise ? ->
		throw new Error "Bottleneck: install 'bluebird' or use Node 0.12 or higher for Promise support"
	constructor: (@maxNb=0, @minTime=0, @highWater=0, @strategy=Bottleneck::strategy.LEAK) ->
		@_nextRequest = Date.now()
		@_nbRunning = 0
		@_queue = []
		@_timeouts = []
		@_unblockTime = 0
		@penalty = (15 * @minTime) or 5000
		@interrupt = false
		@reservoir = null
		@limiter = null
	chain: (@limiter) -> @
	isBlocked: -> @_unblockTime >= Date.now()
	check: -> (@_nbRunning < @maxNb or @maxNb <= 0) and (@_nextRequest-Date.now()) <= 0 and (not @reservoir? or @reservoir > 0)
	_tryToRun: ->
		if (@_nbRunning < @maxNb or @maxNb <= 0) and @_queue.length > 0 and (not @reservoir? or @reservoir > 0)
			@_nbRunning++
			if @reservoir? then @reservoir--
			wait = Math.max @_nextRequest-Date.now(), 0
			@_nextRequest = Date.now() + wait + @minTime
			next = @_queue.shift()
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
	submit: (task, args..., cb) =>
		reachedHighWaterMark = @highWater > 0 and @_queue.length == @highWater
		if @strategy == Bottleneck::strategy.BLOCK and (reachedHighWaterMark or @isBlocked())
			@_unblockTime = Date.now() + @penalty
			@_nextRequest = @_unblockTime + @minTime
			@_queue = []
			return true
		else if reachedHighWaterMark
			if @strategy == Bottleneck::strategy.LEAK then @_queue.shift()
			else if @strategy == Bottleneck::strategy.OVERFLOW then return reachedHighWaterMark
		@_queue.push {task, args, cb}
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
