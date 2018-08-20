var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

describe('Stop', function () {
  var c

  afterEach(function () {
    c.limiter.disconnect(false)
  })

  it('Should stop and drop the queue', function (done) {
    c = makeTest({maxConcurrent: 2, minTime: 100, trackDoneStatus: true})
    var submitFailed = false
    var queuedDropped = false
    var scheduledDropped = false
    var dropped = 0

    c.limiter.on('dropped', function () {
      dropped++
    })

    c.limiter.ready()
    .then(function () {

      c.pNoErrVal(c.limiter.schedule({id: '0'}, c.promise, null, 0), 0)

      c.pNoErrVal(c.limiter.schedule({id: '1'}, c.slowPromise, 100, null, 1), 1)

      c.limiter.schedule({id: '2'}, c.promise, null, 2)
      .catch(function (err) {
        c.mustEqual(err.message, 'Dropped!')
        scheduledDropped = true
      })

      c.limiter.schedule({id: '3'}, c.promise, null, 3)
      .catch(function (err) {
        c.mustEqual(err.message, 'Dropped!')
        queuedDropped = true
      })

      setTimeout(function () {
        var counts = c.limiter.counts()
        c.mustEqual(counts.RECEIVED, 0)
        c.mustEqual(counts.QUEUED, 1)
        c.mustEqual(counts.RUNNING, 1)
        c.mustEqual(counts.EXECUTING, 1)
        c.mustEqual(counts.DONE, 1)

        c.limiter.stop({
          enqueueErrorMessage: 'Stopped!',
          dropErrorMessage: 'Dropped!'
        })
        .then(function () {
          counts = c.limiter.counts()
          c.mustEqual(submitFailed, true)
          c.mustEqual(scheduledDropped, true)
          c.mustEqual(queuedDropped, true)
          c.mustEqual(dropped, 2)
          c.mustEqual(counts.RECEIVED, 0)
          c.mustEqual(counts.QUEUED, 0)
          c.mustEqual(counts.RUNNING, 0)
          c.mustEqual(counts.EXECUTING, 0)
          c.mustEqual(counts.DONE, 2)

          c.checkResultsOrder([[0], [1]])
          done()
        })

        c.limiter.schedule(() => Promise.resolve(true))
        .catch(function (err) {
          c.mustEqual(err.message, 'Stopped!')
          submitFailed = true
        })

      }, 125)
    })
  })

  it('Should stop and let the queue finish', function (done) {
    c = makeTest({maxConcurrent: 1, minTime: 100, trackDoneStatus: true})
    var submitFailed = false
    var dropped = 0

    c.limiter.on('dropped', function () {
      dropped++
    })

    c.limiter.ready()
    .then(function () {

      c.pNoErrVal(c.limiter.schedule({id: '1'}, c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule({id: '2'}, c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule({id: '3'}, c.slowPromise, 100, null, 3), 3)

      setTimeout(function () {
        var counts = c.limiter.counts()
        c.mustEqual(counts.RECEIVED, 0)
        c.mustEqual(counts.QUEUED, 1)
        c.mustEqual(counts.RUNNING, 1)
        c.mustEqual(counts.EXECUTING, 0)
        c.mustEqual(counts.DONE, 1)

        c.limiter.stop({
          enqueueErrorMessage: 'Stopped!',
          dropWaitingJobs: false
        })
        .then(function () {
          counts = c.limiter.counts()
          c.mustEqual(submitFailed, true)
          c.mustEqual(dropped, 0)
          c.mustEqual(counts.RECEIVED, 0)
          c.mustEqual(counts.QUEUED, 0)
          c.mustEqual(counts.RUNNING, 0)
          c.mustEqual(counts.EXECUTING, 0)
          c.mustEqual(counts.DONE, 4)

          c.checkResultsOrder([[1], [2], [3]])
          done()
        })

        c.limiter.schedule(() => Promise.resolve(true))
        .catch(function (err) {
          c.mustEqual(err.message, 'Stopped!')
          submitFailed = true
        })

      }, 75)
    })
  })

})
