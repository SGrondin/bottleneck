parser = require "./parser"
Events = require "./Events"

class Batcher
  defaults:
    maxTime: null
    maxSize: null
    Promise: Promise

  constructor: (@options={}) ->
    parser.load @options, @defaults, @
    @Events = new Events @
    @_arr = []
    @_resetPromise()
    @_lastFlush = Date.now()
    if @maxTime?
      (@interval = setInterval =>
        if Date.now() >= @_lastFlush + @maxTime && @_arr.length > 0
          @_flush()
      , Math.max(Math.floor(@maxTime / 5), 25)).unref?()

  _resetPromise: ->
    _resolve = null
    _promise = new @Promise (res, rej) -> _resolve = res
    { @_promise, @_resolve } = { _promise, _resolve }

  _flush: ->
    @_lastFlush = Date.now()
    @_resolve()
    @Events.trigger "batch", [@_arr]
    @_arr = []
    @_resetPromise()

  add: (data) ->
    @_arr.push data
    ret = @_promise
    if @_arr.length == @maxSize
      @_flush()
    ret

module.exports = Batcher
