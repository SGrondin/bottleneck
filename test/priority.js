var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')

describe('Priority', function () {
  it('Should do basic ordering', function () {
    var c = makeTest({maxConcurrent: 1, minTime: 250, rejectOnDrop: false})

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.limiter.submit(c.job, null, 4, c.noErrVal(4))
      c.limiter.submit({priority: 1}, c.job, null, 5, 6, c.noErrVal(5, 6))

      return c.last()
    })
    .then(function (results) {
      c.checkResultsOrder([[1], [5,6], [2] ,[3], [4]])
      c.checkDuration(1000)
    })
  })

  it('Should support LEAK', function () {
    var c = makeTest({
      maxConcurrent: 1,
      minTime: 250,
      highWater: 2,
      strategy: Bottleneck.strategy.LEAK,
      rejectOnDrop: false
    })

    var called = false
    var called2 = false
    c.limiter.on('dropped', function (dropped) {
      c.mustExist(dropped.task)
      c.mustExist(dropped.args)
      c.mustExist(dropped.cb)
      called = true
    })
    c.limiter.on('dropped', function (dropped) {
      c.mustExist(dropped.task)
      c.mustExist(dropped.args)
      c.mustExist(dropped.cb)
      called2 = true
    })

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.limiter.submit(c.job, null, 4, c.noErrVal(4))
      c.limiter.submit({priority: 2}, c.job, null, 5, c.noErrVal(5))
      c.limiter.submit({priority: 1}, c.job, null, 6, c.noErrVal(6))
      c.limiter.submit({priority: 9}, c.job, null, 7, c.noErrVal(7))

      return c.limiter.updateSettings({highWater: null})
    })
    .then(c.last)
    .then(function (results) {
      c.checkDuration(500)
      c.checkResultsOrder([[1], [6], [5]])
      c.mustEqual(called, true)
      c.mustEqual(called2, true)
    })
  })

  it('Should support OVERFLOW', function () {
    var c = makeTest({
      maxConcurrent: 1,
      minTime: 250,
      highWater: 2,
      strategy: Bottleneck.strategy.OVERFLOW,
      rejectOnDrop: false
    })
    var called = false
    c.limiter.on('dropped', function (dropped) {
      c.mustExist(dropped.task)
      c.mustExist(dropped.args)
      c.mustExist(dropped.cb)
      called = true
    })

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.limiter.submit(c.job, null, 4, c.noErrVal(4))
      c.limiter.submit({priority: 2}, c.job, null, 5, c.noErrVal(5))
      c.limiter.submit({priority: 1}, c.job, null, 6, c.noErrVal(6))
      c.limiter.submit({priority: 9}, c.job, null, 7, c.noErrVal(7))

      return c.limiter.updateSettings({highWater: null})
    })
    .then(c.last)
    .then(function (results) {
      c.checkDuration(500)
      c.checkResultsOrder([[1], [2], [3]])
      c.mustEqual(called, true)
    })
  })

  it('Should support OVERFLOW_PRIORITY', function () {
    var c = makeTest({
      maxConcurrent: 1,
      minTime: 250,
      highWater: 2,
      strategy: Bottleneck.strategy.OVERFLOW_PRIORITY,
      rejectOnDrop: false
    })
    var called = false
    c.limiter.on('dropped', function (dropped) {
      c.mustExist(dropped.task)
      c.mustExist(dropped.args)
      c.mustExist(dropped.cb)
      called = true
    })

    return c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.limiter.submit(c.job, null, 4, c.noErrVal(4))
      c.limiter.submit({priority: 2}, c.job, null, 5, c.noErrVal(5))
      c.limiter.submit({priority: 2}, c.job, null, 6, c.noErrVal(6))
      c.limiter.submit({priority: 2}, c.job, null, 7, c.noErrVal(7))

      return c.limiter.updateSettings({highWater: null})
    })
    .then(c.last)
    .then(function (results) {
      c.checkDuration(500)
      c.checkResultsOrder([[1], [5], [6]])
      c.mustEqual(called, true)
    })
  })

  it('Should support BLOCK', function (done) {
    var c = makeTest({
      maxConcurrent: 1,
      minTime: 250,
      highWater: 2,
      strategy: Bottleneck.strategy.BLOCK,
      rejectOnDrop: false
    })
    var called = 0
    c.limiter.on('dropped', function (dropped) {
      c.mustExist(dropped.task)
      c.mustExist(dropped.args)
      c.mustExist(dropped.cb)
      called++
      if (called === 3) {
        c.checkDuration(0)
        c.checkResultsOrder([[1]])
        done()
      }
    })

    c.limiter.ready()
    .then(function () {
      c.limiter.submit(c.job, null, 1, c.noErrVal(1))
      c.limiter.submit(c.job, null, 2, c.noErrVal(2))
      c.limiter.submit(c.job, null, 3, c.noErrVal(3))
      c.limiter.submit({priority: 2}, c.job, null, 5, c.noErrVal(5))
      c.limiter.submit({priority: 2}, c.job, null, 6, c.noErrVal(6))
      c.limiter.submit({priority: 2}, c.job, null, 7, c.noErrVal(7))
    })
  })

  it('Should have the right priority', function () {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    return c.limiter.ready()
    .then(function () {
      c.pNoErrVal(c.limiter.schedule({priority: 6}, c.promise, null, 1), 1)
      c.pNoErrVal(c.limiter.schedule({priority: 5}, c.promise, null, 2), 2)
      c.pNoErrVal(c.limiter.schedule({priority: 4}, c.promise, null, 3), 3)
      c.pNoErrVal(c.limiter.schedule({priority: 3}, c.promise, null, 4), 4)
      return c.last()
    })
    .then(function (results) {
      c.checkDuration(750)
      c.checkResultsOrder([[1], [4], [3], [2]])
    })
  })

})
