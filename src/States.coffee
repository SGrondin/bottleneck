BottleneckError = require "./BottleneckError"
class States
  constructor: (@status) ->
    @jobs = {}
    @counts = @status.map(-> 0)

  next: (id) ->
    current = @jobs[id]
    next = current + 1
    if current? and next < @status.length
      @counts[current]--
      @counts[next]++
      @jobs[id]++
    else if current?
      @counts[current]--
      delete @jobs[id]

  start: (id, initial=0) ->
    @jobs[id] = initial
    @counts[initial]++

  remove: (id) ->
    current = @jobs[id]
    if current?
      @counts[current]--
      delete @jobs[id]

  jobStatus: (id) -> @status[@jobs[id]] ? null

  statusCounts: -> @counts.reduce(((acc, v, i) => acc[@status[i]] = v; acc), {})

module.exports = States
