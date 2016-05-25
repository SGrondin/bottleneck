class Cluster
	constructor: (@maxNb, @minTime, @highWater, @strategy, @rejectOnDrop) ->
		@limiters = {}
		@Bottleneck = require "./Bottleneck"
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
				if (v._nextRequest+(1000*60*5)) < time then @deleteKey k
		, 1000*30).unref?()
	stopAutoCleanup: -> clearInterval @interval

module.exports = Cluster
