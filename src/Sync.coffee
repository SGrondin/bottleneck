DLList = require "./DLList"
BottleneckError = require "./BottleneckError"
class Sync
  constructor: (@name) ->
    @_running = 0
    @_queue = new DLList()
  _tryToRun: ->
    if (@_running < 1) and @_queue.length > 0
      @_running++
      next = @_queue.shift()
      next.task.apply {}, next.args.concat (args...) =>
        @_running--
        @_tryToRun()
        next.cb?.apply {}, args
  submit: (task, args..., cb) =>
    @_queue.push {task, args, cb}
    @_tryToRun()
  schedule: (task, args...) =>
    wrapped = (args..., cb) ->
      (task.apply {}, args)
      .then (args...) -> cb.apply {}, Array::concat null, args
      .catch (args...) -> cb.apply {}, args
    new Promise (resolve, reject) =>
      @submit.apply {}, Array::concat wrapped, args, (args...) ->
        (if args[0]? then reject else args.shift(); resolve).apply {}, args
  wrap: (fn) => (args...) => @schedule.apply {}, Array::concat fn, args

module.exports = Sync
