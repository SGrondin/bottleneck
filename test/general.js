var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

describe('General', function () {

  it('Should prompt to upgrade', function () {
    var c = makeTest()
    try {
      var limiter = new Bottleneck(1, 250)
    } catch (err) {
      c.mustEqual(err.message, 'Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-from-v1 if you\'re upgrading from Bottleneck v1.')
    }
  })

  it('Should return the queued count with and without a priority value', function (done) {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    c.mustEqual(c.limiter.queued(), 0)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.mustEqual(c.limiter.queued(), 0) // It's already running

    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.mustEqual(c.limiter.queued(), 1)
    c.mustEqual(c.limiter.queued(1), 0)
    c.mustEqual(c.limiter.queued(5), 1)

    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.mustEqual(c.limiter.queued(), 2)
    c.mustEqual(c.limiter.queued(1), 0)
    c.mustEqual(c.limiter.queued(5), 2)

    c.limiter.submit(c.job, null, 4, c.noErrVal(4))
    c.mustEqual(c.limiter.queued(), 3)
    c.mustEqual(c.limiter.queued(1), 0)
    c.mustEqual(c.limiter.queued(5), 3)

    c.limiter.submit({priority: 1}, c.job, null, 5, c.noErrVal(5))
    c.mustEqual(c.limiter.queued(), 4)
    c.mustEqual(c.limiter.queued(1), 1)
    c.mustEqual(c.limiter.queued(5), 3)

    c.last(function (err, results) {
      c.mustEqual(c.limiter.queued(), 0)
      c.checkResultsOrder([[1], [5], [2], [3], [4]])
      c.checkDuration(1000)
      done()
    })
  })

  it('Should return the running count', function (done) {
    var c = makeTest({maxConcurrent: 2, minTime: 250})

    c.mustEqual(c.limiter.running(), 0)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.mustEqual(c.limiter.running(), 1)

    setTimeout(function () {
      c.mustEqual(c.limiter.running(), 0)
      setTimeout(function () {
        c.limiter.submit(c.job, null, 1, c.noErrVal(1))
        c.limiter.submit(c.job, null, 2, c.noErrVal(2))
        c.limiter.submit(c.job, null, 3, c.noErrVal(3))
        c.limiter.submit(c.job, null, 4, c.noErrVal(4))
        c.mustEqual(c.limiter.running(), 2)
        done()
      }, 0)
    }, 0)
  })

  describe('Events', function () {
    it('Should fire events on empty queue', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250})
      var calledEmpty = 0
      var calledIdle = 0

      c.limiter.on('empty', function () { calledEmpty++ })
      c.limiter.on('idle', function () { calledIdle++ })

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.limiter.on('idle', function () {
        c.limiter.removeAllListeners()
        c.last(function (err, results) {
          c.checkResultsOrder([[1], [2], [3]])
          c.checkDuration(500)
          c.mustEqual(calledEmpty, 2)
          c.mustEqual(calledIdle, 1)
          done()
        })
      })
    })

    it('Should fire events once', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250})
      var calledEmpty = 0
      var calledIdle = 0

      c.limiter.once('empty', function () { calledEmpty++ })
      c.limiter.once('idle', function () { calledIdle++ })

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.limiter.on('idle', function () {
        c.limiter.removeAllListeners()
        c.last(function (err, results) {
          c.checkResultsOrder([[1], [2], [3]])
          c.checkDuration(500)
          c.mustEqual(calledEmpty, 1)
          c.mustEqual(calledIdle, 1)
          done()
        })
      })
    })

    it('Should fire events when calling stopAll() (sync)', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250, rejectOnDrop: false})
      var calledEmpty = 0
      var calledIdle = 0
      var calledDropped = 0

      c.limiter.on('empty', function () { calledEmpty++ })
      c.limiter.on('idle', function () { calledIdle++ })
      c.limiter.on('dropped', function () { calledDropped++ })

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)

      c.limiter.stopAll()
      setTimeout(function () {
        c.mustEqual(calledEmpty, 2)
        c.mustEqual(calledDropped, 2)
        c.mustEqual(calledIdle, 0)
        done()
      }, 30)
    })

    it('Should fire events when calling stopAll() (async)', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250, rejectOnDrop: false})
      var calledEmpty = 0
      var calledDropped = 0
      var failedPromise = 0
      var failedCb = 0

      c.limiter.on('empty', function () { calledEmpty++ })
      c.limiter.on('dropped', function (dropped) {
        c.mustEqual(dropped.args.length, 2)
        calledDropped++
      })

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)

      setTimeout(function () {
        c.limiter.stopAll(true)

        c.limiter.schedule(c.promise, null, 4)
        .then(() => assert(false))
        .catch(function (err) {
          c.mustEqual(err.message, 'This limiter is stopped')
          failedPromise++
        })

        c.limiter.submit(c.job, null, 5, function (err) {
          c.mustEqual(err.message, 'This limiter is stopped')
          failedCb++
        })
      }, 0)

      setTimeout(function () {
        c.mustEqual(calledEmpty, 2)
        assert(calledDropped === 2 || calledDropped === 3)
        c.mustEqual(failedPromise, 1)
        c.mustEqual(failedCb, 1)
        done()
      }, 50)
    })

    it('Should fail (with BottleneckError) when rejectOnDrop is true', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250, highWater: 1, rejectOnDrop: true})
      var dropped = false
      var checkedError = false

      c.limiter.on('dropped', function () {
        dropped = true
        if (dropped && checkedError) {
          done()
        }
      })

      c.limiter.submit(c.job, null, 1, c.noErrVal(1))

      c.limiter.submit(c.job, null, 2, function (err) {
        assert(err instanceof Bottleneck.BottleneckError)
        c.mustEqual(err.message, 'This job has been dropped by Bottleneck')
        checkedError = true
        if (dropped && checkedError) {
          done()
        }
      })

      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    })
  })

  describe('High water limit', function () {
    it('Should support highWater set to 0', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250, highWater: 0, rejectOnDrop: false})

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 4), 4)
      c.limiter.updateSettings({highWater: null})
      c.last(function (err, results) {
        c.checkDuration(0)
        c.checkResultsOrder([[1]])
        done()
      })
    })

    it('Should support highWater set to 1', function (done) {
      var c = makeTest({maxConcurrent: 1, minTime: 250, highWater: 1, rejectOnDrop: false})

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 4), 4)
      c.limiter.updateSettings({highWater: null})
      c.last(function (err, results) {
        c.checkDuration(250)
        c.checkResultsOrder([[1], [4]])
        done()
      })
    })
  })

  describe('Weight', function () {
    it('Should not add jobs with a weight above the maxConcurrent', function (done) {
      var c = makeTest({maxConcurrent: 2})

      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule({ weight: 2 }, c.promise, null, 2), 2)

      c.limiter.schedule({ weight: 3 }, c.promise, null, 3)
      .catch(function (err) {
        c.mustEqual(err.message, 'Impossible to add a job having a weight of 3 to a limiter having a maxConcurrent setting of 2')
        c.last(function (err, results) {
          c.checkDuration(0)
          c.checkResultsOrder([[1], [2]])
          done()
        })
      })
    })


    it('Should support custom job weights', function (done) {
      var c = makeTest({maxConcurrent: 2})

      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule({ weight: 2 }, c.slowPromise, 200, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 4), 4)
      c.pNoErrVal(c.limiter.schedule({ weight: 0 }, c.slowPromise, 100, null, 5), 5)

      c.last(function (err, results) {
        c.checkDuration(400)
        c.checkResultsOrder([[1], [2], [3], [4], [5]])
        done()
      })
    })

    it('Should overflow at the correct rate', function (done) {
      var c = makeTest({
        maxConcurrent: 2,
        reservoir: 3
      })

      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 1), 1)

      var promise2 = c.limiter.schedule({ weight: 2 }, c.slowPromise, 150, null, 2)
      c.pNoErrVal(promise2, 2)
      promise2.then(function () {
        c.mustEqual(c.limiter.currentReservoir(), 0)
        c.mustEqual(c.limiter.queued(), 2)

        c.last(function (err, results) {
          c.mustEqual(c.limiter.currentReservoir(), 0)
          c.mustEqual(c.limiter.queued(), 2)
          c.checkDuration(250)
          c.checkResultsOrder([[1], [2]])
          done()
        }, { priority: 1, weight: 0 })
      })

      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule({ weight: 1 }, c.slowPromise, 100, null, 4), 4)

    })

  })
})