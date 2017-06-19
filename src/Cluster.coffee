class Cluster
	constructor: (@maxNb, @minTime, @highWater, @strategy, @rejectOnDrop) ->
		@limiters = {}
		@Bottleneck = require "./Bottleneck"
		@timeout = 1000 * 60 * 5
		@startAutoCleanup()
	key: (key="") -> @limiters[key] ? (@limiters[key] = new @Bottleneck @maxNb, @minTime, @highWater, @strategy, @rejectOnDrop)
	deleteKey: (key="") -> delete @limiters[key]
	all: (cb) -> for own k,v of @limiters then cb v
	keys: -> Object.keys @limiters
	startAutoCleanup: ->
		@stopAutoCleanup()
		(@interval = setInterval =>
			time = Date.now()
			for k,v of @limiters
				if (v._nextRequest + @timeout) < time then @deleteKey k
		, (@timeout / 10)).unref?()
	stopAutoCleanup: -> clearInterval @interval
	changeTimeout: (@timeout) -> @startAutoCleanup()

module.exports = Cluster
