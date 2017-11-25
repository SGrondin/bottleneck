var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')

describe('Promises', function () {
  it('Should support promises', function () {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, 9, c.noErrVal(1, 9))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 4, 5), 4, 5)
      return c.last()
    })
    .then(function (results) {
      c.checkResultsOrder([[1,9], [2], [3], [4,5]])
      c.checkDuration(750)
    })
  })

  it('Should pass error on failure', function () {
    var failureMessage = 'failed'
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    return c.limiter.ready()
    .then(function () {
      return c.limiter.schedule(c.promise, new Error(failureMessage))
    })
    .catch(function (err) {
      c.mustEqual(err.message, failureMessage)
    })
  })

  it('Should get rejected when rejectOnDrop is true', function (done) {
    var c = makeTest({
      maxConcurrent: 1,
      minTime: 250,
      highWater: 1,
      strategy: Bottleneck.strategy.OVERFLOW,
      rejectOnDrop: true
    })
    var dropped = false
    var checkedError = false

    c.limiter.on('dropped', function () {
      dropped = true
      if (dropped && checkedError) {
        done()
      }
    })

    c.limiter.ready()
    .then(function () {
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)

      return c.limiter.schedule(c.promise, null, 2)
    })
    .catch(function (err) {
      c.mustEqual(err.message, 'This job has been dropped by Bottleneck')
      checkedError = true
      if (dropped && checkedError) {
        done()
      }
    })

  })

  it('Should wrap', function () {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))

      var wrapped = c.limiter.wrap(c.promise)
      c.pNoErrVal(wrapped(null, 4), 4)

      return c.last()
    })
    .then(function (results) {
      c.checkResultsOrder([[1], [2], [3], [4]])
      c.checkDuration(750)
    })
  })

  it('Should pass errors when wrapped', function () {
    var failureMessage = 'BLEW UP!!!'
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    return c.limiter.ready()
    .then(function () {
      var wrapped = c.limiter.wrap(c.promise)
      c.pNoErrVal(wrapped(null, 1), 1)
      c.pNoErrVal(wrapped(null, 2), 2)

      return wrapped(new Error(failureMessage), 3)
    })
    .catch(function (err) {
      c.mustEqual(err.message, failureMessage)
      return c.last()
    })
    .then(function (results) {
      c.checkResultsOrder([[1], [2], [3]])
      c.checkDuration(500)
    })
  })
})
