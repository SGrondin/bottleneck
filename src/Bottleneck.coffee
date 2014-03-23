class Bottleneck
	constructor: (@maxNb=0, @minTime=0) ->
		@_nextRequest = Date.now()
		@_nbRunning = 0
		@_queue = []
		@_timeouts = []
	_tryToRun: ->
		if (@_nbRunning < @maxNb or @maxNb <= 0) and @_queue.length > 0
			@_nbRunning++
			wait = Math.max @_nextRequest-Date.now(), 0
			@_nextRequest = Date.now() + wait + @minTime
			next = @_queue.shift()
			done = false
			index = @_timeouts.push setTimeout () =>
				next.task.apply {}, next.args.concat () =>
					if not done
						done = true
						@_timeouts[index-1] = null
						@_nbRunning--
						@_tryToRun()
						next.cb?.apply {}, Array::slice.call arguments, 0
			, wait
	submit: (task, args..., cb) ->
		@_queue.push {task, args, cb}
		@_tryToRun()
	changeSettings: (@maxNb=@maxNb, @minTime=@minTime) -> @
	stopAll: ->
		(clearTimeout a for a in @_timeouts)
		@_tryToRun = -> # Ugly, but it's that or more global state

module.exports = Bottleneck
