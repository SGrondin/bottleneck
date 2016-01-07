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
})
