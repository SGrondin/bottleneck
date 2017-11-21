parser = require "./parser"
DLList = require "./DLList"
Bottleneck = require "./Bottleneck"
class Local
  constructor: (initialReservoir) ->
    @_reservoir = initialReservoir
    @_nextRequest = Date.now()
    @_running = 0
    @_unblockTime = 0

  __running__: -> @_running

  conditionsCheck: (maxConcurrent, reservoirEnabled, weight) ->
    ((not maxConcurrent? or @_running+weight <= maxConcurrent) and
    (not reservoirEnabled or @_reservoir-weight >= 0))

  __incrementReservoir__: (incr) -> @_reservoir += incr

  __currentReservoir__: -> @_reservoir

  __isBlocked__: (now) -> @_unblockTime >= now

  __check__: (weight, reservoirEnabled, now, maxConcurrent) ->
    (@conditionsCheck(maxConcurrent, reservoirEnabled, weight) and
    (@_nextRequest-now) <= 0)

  __register__: (weight, reservoirEnabled, now, maxConcurrent, minTime) ->
    if @conditionsCheck maxConcurrent, reservoirEnabled, weight
      @_running += weight
      if reservoirEnabled then @_reservoir -= weight
      wait = Math.max @_nextRequest-now, 0
      @_nextRequest = now + wait + minTime
      { success: true, wait }
    else { success: false }

  __submit__: (strategyIsBlock, penalty, reservoirEnabled, highwaterEnabled, queueMaxed, weight, now, maxConcurrent, minTime) ->
    check = @__check__(weight, reservoirEnabled, now, maxConcurrent)
    reachedHighWaterMark = highwaterEnabled and queueMaxed and not check
    blocked = strategyIsBlock and (reachedHighWaterMark or @__isBlocked__ now)
    if blocked
      @_unblockTime = now + penalty
      @_nextRequest = @_unblockTime + minTime
    { reachedHighWaterMark, blocked }

  __free__: (weight) ->
    @_running -= weight
    { running: @_running }

module.exports = Local
