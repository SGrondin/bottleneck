describe('Promises', function () {
  it('Should support promises', function (done) {
    var c = makeTest(1, 250)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.pNoErrVal(c.limiter.schedule(c.promise, null, 4), 4)
    c.last(function (err, results) {
      c.checkResultsOrder([1,2,3,4])
      c.checkDuration(750)
      console.assert(c.asserts() === 7)
      done()
    })
  })

  it('Should pass error on failure', function (done) {
    var failureMessage = 'failed'
    var c = makeTest(1, 250)

    c.limiter.schedule(c.promise, new Error(failureMessage))
    .catch(function (err) {
      console.assert(err.message === failureMessage)
      done()
    })
  })

  it('Should get rejected when rejectOnDrop is true', function (done) {
    var c = makeTest(1, 250, 1, null, true)
    var dropped = false
    var checkedError = false

    c.limiter.on('dropped', function () {
      dropped = true
      if (dropped && checkedError) {
        done()
      }
    })

    c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)

    c.limiter.schedule(c.promise, null, 2)
    .catch(function (err) {
      console.assert(err.message == 'This job has been dropped by Bottleneck')
      checkedError = true
      if (dropped && checkedError) {
        done()
      }
    })

    c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
  })
})
