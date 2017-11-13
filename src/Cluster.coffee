parser = require "./parser"
class Cluster
  defaults: { timeout: 1000 * 60 * 5 }
  constructor: (@limiterOptions={}, clusterOptions={}) ->
    parser.load clusterOptions, @defaults, @
    @limiters = {}
    @Bottleneck = require "./Bottleneck"
    @startAutoCleanup()
  key: (key="") -> @limiters[key] ? (@limiters[key] = new @Bottleneck @limiterOptions)
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
  updateSettings: (options={}) ->
    parser.overwrite options, @defaults, @
    @startAutoCleanup() if options.timeout?

module.exports = Cluster
