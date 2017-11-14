parser = require "./parser"
DLList = require "./DLList"
Bottleneck = require "./Bottleneck"
class Local
  constructor: (@instance) ->
    @_queues = -> @instance._queues
    @_reservoir = @instance.reservoir
    @_nextRequest = Date.now()
    @_running = 0
    @_unblockTime = 0
  __running__: -> @_running

  __globalQueued__: () -> @_queues().reduce ((a, b) -> a+b.length), 0

  conditionsCheck: (maxConcurrent, reservoirEnabled, weight) ->
    ((not maxConcurrent? or @_running+weight <= maxConcurrent) and
    (not reservoirEnabled or @_reservoir-weight >= 0))

  __check__: (weight, reservoirEnabled, now, maxConcurrent) ->
    (@conditionsCheck(maxConcurrent, reservoirEnabled, weight) and
    (@_nextRequest-now) <= 0)

  __register__: (weight, reservoirEnabled, now, maxConcurrent, minTime) ->
    if @conditionsCheck maxConcurrent, reservoirEnabled, weight
      @_running += weight
      if reservoirEnabled then @_reservoir -= weight
      wait = Math.max @_nextRequest-now, 0
      @_nextRequest = now + wait + minTime
      { success: true, wait, reservoir: @_reservoir }
    else { success: false }

  __free__: (weight) ->
    @_running -= weight
    { running: @_running, queued: @__globalQueued__() }




module.exports = Local
