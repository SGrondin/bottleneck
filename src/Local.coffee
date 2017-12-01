parser = require "./parser"
DLList = require "./DLList"
BottleneckError = require "./BottleneckError"

class Local
  constructor: (options) ->
    parser.load options, options, @
    @_nextRequest = Date.now()
    @_running = 0
    @_unblockTime = 0
    @_ready = @yieldLoop()

  yieldLoop: (t=0) -> new @Promise (resolve, reject) -> setTimeout resolve, t

  computePenalty: -> @penalty ? ((15 * @minTime) or 5000)

  __updateSettings__: (options) ->
    await @yieldLoop()
    parser.overwrite options, options, @
    true

  __running__: ->
    await @yieldLoop()
    @_running

  conditionsCheck: (weight) ->
    ((not @maxConcurrent? or @_running+weight <= @maxConcurrent) and
    (not @reservoir? or @reservoir-weight >= 0))

  __incrementReservoir__: (incr) ->
    await @yieldLoop()
    @reservoir += incr

  __currentReservoir__: ->
    await @yieldLoop()
    @reservoir

  isBlocked: (now) -> @_unblockTime >= now

  check: (weight, now) -> @conditionsCheck(weight) and (@_nextRequest-now) <= 0

  __check__: (weight) ->
    await @yieldLoop()
    now = Date.now()
    @check weight, now

  __register__: (weight) ->
    await @yieldLoop()
    now = Date.now()
    if @conditionsCheck weight
      @_running += weight
      if @reservoir? then @reservoir -= weight
      wait = Math.max @_nextRequest-now, 0
      @_nextRequest = now + wait + @minTime
      { success: true, wait }
    else { success: false }

  strategyIsBlock: -> @strategy == 3

  __submit__: (queueLength, weight) ->
    await @yieldLoop()
    if @maxConcurrent? and weight > @maxConcurrent
      throw new BottleneckError("Impossible to add a job having a weight of #{weight} to a limiter having a maxConcurrent setting of #{@maxConcurrent}")
    now = Date.now()
    reachedHWM = @highWater? and queueLength == @highWater and not @check(weight, now)
    blocked = @strategyIsBlock() and (reachedHWM or @isBlocked now)
    if blocked
      @_unblockTime = now + @computePenalty()
      @_nextRequest = @_unblockTime + @minTime
    { reachedHWM, blocked, strategy: @strategy }

  __free__: (weight) ->
    await @yieldLoop()
    @_running -= weight
    { running: @_running }

module.exports = Local
