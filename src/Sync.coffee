DLList = require "./DLList"
class Sync
  constructor: (@name, @Promise) ->
    @_running = 0
    @_queue = new DLList()
  isEmpty: -> @_queue.length == 0
  _tryToRun: ->
    if (@_running < 1) and @_queue.length > 0
      @_running++
      next = @_queue.shift()
      next.task next.args..., (args...) =>
        @_running--
        @_tryToRun()
        next.cb? args...
  submit: (task, args..., cb) =>
    @_queue.push {task, args, cb}
    @_tryToRun()
  schedule: (task, args...) ->
    wrapped = (args..., cb) ->
      (task args...)
      .then (args...) -> cb null, args...
      .catch (args...) -> cb args...
    new @Promise (resolve, reject) =>
      @submit wrapped, args..., (args...) ->
        (if args[0]? then reject else args.shift(); resolve) args...

module.exports = Sync
