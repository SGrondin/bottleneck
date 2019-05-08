parser = require "./parser"

class Job
  constructor: (@task, @args, options, jobDefaults, @Promise, NUM_PRIORITIES, DEFAULT_PRIORITY) ->
    @options = parser.load options, jobDefaults
    @options.priority = @_sanitizePriority @options.priority
    if @options.id == jobDefaults.id then @options.id = "#{@options.id}-#{@_randomIndex()}"
    @promise = new @Promise (@resolve, @reject) =>
    @retryCount = 0

  _sanitizePriority: (priority, NUM_PRIORITIES, DEFAULT_PRIORITY) ->
    sProperty = if ~~priority != priority then DEFAULT_PRIORITY else priority
    if sProperty < 0 then 0 else if sProperty > NUM_PRIORITIES-1 then NUM_PRIORITIES-1 else sProperty

  _randomIndex: -> Math.random().toString(36).slice(2)

  execute: (cb) ->
    returned = try @task @args...
    catch e then @Promise.reject e
    (unless returned?.then? and typeof returned.then == "function" then @Promise.resolve(returned) else returned)
    .then (passed) -> cb null, passed
    .catch (err) -> cb err

  done: (err, passed) ->
    if err? then @reject err else @resolve passed

module.exports = Job
