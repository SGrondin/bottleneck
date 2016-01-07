describe('Priority', function () {
  it('Should do basic ordering', function (done) {
    var c = makeTest(1, 250)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.limiter.submit(c.job, null, 4, c.noErrVal(4))
    c.limiter.submitPriority(1, c.job, null, 5, c.noErrVal(5))
    c.last(function (err, results) {
      c.checkResultsOrder([1,5,2,3,4])
      c.checkDuration(1000)
      console.assert(c.asserts() === 10)
      done()
    })
  })

  it('Should support LEAK', function (done) {
    var c = makeTest(1, 250, 2, Bottleneck.strategy.LEAK)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.limiter.submit(c.job, null, 4, c.noErrVal(4))
    c.limiter.submitPriority(2, c.job, null, 5, c.noErrVal(5))
    c.limiter.submitPriority(1, c.job, null, 6, c.noErrVal(6))
    c.limiter.submitPriority(9, c.job, null, 7, c.noErrVal(7))
    c.limiter.changeSettings(null, null, 0)
    c.last(function (err, results) {
      c.checkDuration(500)
      c.checkResultsOrder([1,6,5])
      console.assert(c.asserts() === 6)
      done()
    })
  })

  it('Should support OVERFLOW', function (done) {
    var c = makeTest(1, 250, 2, Bottleneck.strategy.OVERFLOW)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.limiter.submit(c.job, null, 4, c.noErrVal(4))
    c.limiter.submitPriority(2, c.job, null, 5, c.noErrVal(5))
    c.limiter.submitPriority(1, c.job, null, 6, c.noErrVal(6))
    c.limiter.submitPriority(9, c.job, null, 7, c.noErrVal(7))
    c.limiter.changeSettings(null, null, 0)
    c.last(function (err, results) {
      c.checkDuration(500)
      c.checkResultsOrder([1,2,3])
      console.assert(c.asserts() === 6)
      done()
    })
  })

  it('Should support OVERFLOW_PRIORITY', function (done) {
    var c = makeTest(1, 250, 2, Bottleneck.strategy.OVERFLOW_PRIORITY)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.limiter.submit(c.job, null, 4, c.noErrVal(4))
    c.limiter.submitPriority(2, c.job, null, 5, c.noErrVal(5))
    c.limiter.submitPriority(2, c.job, null, 6, c.noErrVal(6))
    c.limiter.submitPriority(2, c.job, null, 7, c.noErrVal(7))
    c.limiter.changeSettings(null, null, 0)
    c.last(function (err, results) {
      c.checkDuration(500)
      c.checkResultsOrder([1,5,6])
      console.assert(c.asserts() === 6)
      done()
    })
  })

  it('Should support BLOCK', function (done) {
    var c = makeTest(1, 250, 2, Bottleneck.strategy.BLOCK)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.limiter.submitPriority(2, c.job, null, 5, c.noErrVal(5))
    c.limiter.submitPriority(2, c.job, null, 6, c.noErrVal(6))
    c.limiter.submitPriority(2, c.job, null, 7, c.noErrVal(7))
    c.limiter.changeSettings(null, null, 0)
    c.limiter._unblockTime = 0
    c.limiter._nextRequest = 0
    c.last(function (err, results) {
      c.checkDuration(0)
      c.checkResultsOrder([1])
      console.assert(c.asserts() === 2)
      done()
    })
  })
})
