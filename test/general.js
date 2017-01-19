describe('General', function () {

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

  it('Should return the nbRunning', function (done) {
    var c = makeTest(2, 250)

    console.assert(c.limiter.nbRunning() === 0)

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    console.assert(c.limiter.nbRunning() === 1)

    setTimeout(function () {
      console.assert(c.limiter.nbRunning() === 0)
      setTimeout(function () {
        c.limiter.submit(c.job, null, 1, c.noErrVal(1))
        c.limiter.submit(c.job, null, 2, c.noErrVal(2))
        c.limiter.submit(c.job, null, 3, c.noErrVal(3))
        c.limiter.submit(c.job, null, 4, c.noErrVal(4))
        console.assert(c.limiter.nbRunning() === 2)
        done()
      }, 0)
    }, 0)
  })

  describe('Events', function () {
    it('Should fire events on empty queue', function (done) {
      var c = makeTest(1, 250)
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
          c.checkResultsOrder([1,2,3])
          c.checkDuration(500)
          console.assert(calledEmpty === 2)
          console.assert(calledIdle === 1)
          done()
        })
      })
    })

    it('Should fire events when calling stopAll() (sync)', function (done) {
      var c = makeTest(1, 250)
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
        console.assert(calledEmpty === 2)
        console.assert(calledDropped === 2)
        console.assert(calledIdle === 0)
        done()
      }, 30)
    })

    it('Should fire events when calling stopAll() (async)', function (done) {
      var c = makeTest(1, 250)
      var calledEmpty = 0
      var calledDropped = 0
      var failedPromise = 0
      var failedCb = 0

      c.limiter.on('empty', function () { calledEmpty++ })
      c.limiter.on('dropped', function (dropped) {
        console.assert(dropped.args.length === 2)
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
          console.assert(err.message === 'This limiter is stopped')
          failedPromise++
        })

        c.limiter.submit(c.job, null, 5, function (err) {
          console.assert(err.message === 'This limiter is stopped')
          failedCb++
        })
      }, 0)

      setTimeout(function () {
        console.assert(calledEmpty === 2)
        console.assert(calledDropped >= 2)
        console.assert(failedPromise === 1)
        console.assert(failedCb === 1)
        done()
      }, 50)
    })

    it('Should fail when rejectOnDrop is true', function (done) {
      var c = makeTest(1, 250, 1, null, true)
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
        console.assert(err.message == 'This job has been dropped by Bottleneck')
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
      var c = makeTest(1, 250, 0)

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 4), 4)
      c.limiter.changeSettings(null, null, -1)
      c.last(function (err, results) {
        c.checkDuration(0)
        c.checkResultsOrder([1])
        console.assert(c.asserts() === 1)
        done()
      })
    })

    it('Should support highWater set to 1', function (done) {
      var c = makeTest(1, 250, 1)

      c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule(c.promise, null, 4), 4)
      c.limiter.changeSettings(null, null, -1)
      c.last(function (err, results) {
        c.checkDuration(250)
        c.checkResultsOrder([1,4])
        console.assert(c.asserts() === 2)
        done()
      })
    })
  })
})