describe('General', function () {
  describe('nbQueued', function () {

    it('Should return the nbQueued with and without a priority value', function (done) {
      var c = makeTest(1, 250)

      console.assert(c.limiter.nbQueued() === 0)

      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      console.assert(c.limiter.nbQueued() === 0) // It's already running

      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      console.assert(c.limiter.nbQueued() === 1)
      console.assert(c.limiter.nbQueued(1) === 0)
      console.assert(c.limiter.nbQueued(5) === 1)

      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      console.assert(c.limiter.nbQueued() === 2)
      console.assert(c.limiter.nbQueued(1) === 0)
      console.assert(c.limiter.nbQueued(5) === 2)

      c.limiter.submit(c.job, null, 4, c.noErrVal(4))
      console.assert(c.limiter.nbQueued() === 3)
      console.assert(c.limiter.nbQueued(1) === 0)
      console.assert(c.limiter.nbQueued(5) === 3)

      c.limiter.submitPriority(1, c.job, null, 5, c.noErrVal(5))
      console.assert(c.limiter.nbQueued() === 4)
      console.assert(c.limiter.nbQueued(1) === 1)
      console.assert(c.limiter.nbQueued(5) === 3)

      c.last(function (err, results) {
        console.assert(c.limiter.nbQueued() === 0)
        c.checkResultsOrder([1,5,2,3,4])
        c.checkDuration(1000)
        console.assert(c.asserts() === 10)
        done()
      })
    })
  })
})