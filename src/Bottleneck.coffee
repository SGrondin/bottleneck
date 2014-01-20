class Bottleneck
	constructor: (@maxNb=0, @minTime=0) ->
		@nextRequest = Date.now()
		@nbRunning = 0
		@queue = []
		@timeouts = []

	_tryToRun: ->
		if (@nbRunning < @maxNb or @maxNb <= 0) and @queue.length > 0
			@nbRunning++
			wait = Math.max @nextRequest-Date.now(), 0
			@nextRequest = Date.now() + wait + @minTime
			next = @queue.shift()
			done = false
			@timeouts.push setTimeout () =>
				next.task () =>
					if not done
						done = true
						@nbRunning--
						@_tryToRun()
						next.cb.apply {}, Array::slice.call arguments, 0
			, wait
	submit: (task, cb) ->
		@queue.push {task, cb}
		@_tryToRun()

	stopAll: ->
		(clearTimeout a for a in @timeouts)
		@_tryToRun = -> # Ugly, but it's that or more global state

module.exports = Bottleneck
