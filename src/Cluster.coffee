class Cluster
	constructor: (@maxNb, @minTime, @highWater, @strategy) ->
		@limiters = {}
		@Bottleneck = require "./Bottleneck"
		(setInterval =>
			time = Date.now()
			for k,v of @limiters
				if (v._nextRequest+(60*1000*5)) < time then delete @limiters[k]
		, 60*1000).unref?()
	key: (key="") -> @limiters[key] ? (@limiters[key] = new @Bottleneck @maxNb, @minTime, @highWater, @strategy)
	all: (cb) -> for own k,v of @limiters then cb v
	keys: -> Object.keys @limiters

module.exports = Cluster
