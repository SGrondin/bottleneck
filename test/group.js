var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

describe('Group', function () {
  var c

  afterEach(function () {
    if (c.limiter.datastore === 'redis') {
      c.limiter.disconnect(false)
    }
  })

  it('Should make Groups', function (done) {
    c = makeTest()
    var group = new Bottleneck.Group({
      maxConcurrent: 1, minTime: 100
    })

    var results = []

    var job = function (...result) {
      results.push(result)
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          return resolve()
        }, 50)
      })
    }

    group.key('A').schedule(job, 1, 2)
    group.key('A').schedule(job, 3)
    group.key('A').schedule(job, 4)
    setTimeout(function () {
      group.key('B').schedule(job, 5)
    }, 20)
    setTimeout(function () {
      group.key('C').schedule(job, 6)
      group.key('C').schedule(job, 7)
    }, 40)

    group.key('A').submit(function (cb) {
      c.mustEqual(results, [[1,2], [5], [6], [3], [7], [4]])
      cb()
      done()
    }, null)
  })

  it('Should pass error on failure', function (done) {
    var failureMessage = 'SOMETHING BLEW UP!!'
    c = makeTest()
    var group = new Bottleneck.Group({
      maxConcurrent: 1, minTime: 100
    })
    c.mustEqual(Object.keys(group.limiters), [])

    var results = []

    var job = function (...result) {
      results.push(result)
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          return resolve()
        }, 50)
      })
    }

    group.key('A').schedule(job, 1, 2)
    group.key('A').schedule(job, 3)
    group.key('A').schedule(job, 4)
    group.key('B').schedule(() => Promise.reject(new Error(failureMessage)))
    .catch(function (err) {
      results.push(['CAUGHT', err.message])
    })
    setTimeout(function () {
      group.key('C').schedule(job, 6)
      group.key('C').schedule(job, 7)
    }, 40)


    group.key('A').submit(function (cb) {
      c.mustEqual(results, [[1,2], ['CAUGHT', failureMessage], [6], [3], [7], [4]])
      cb()
      done()
    }, null)
  })

  it('Should update its settings', function () {
    c = makeTest()
    var group1 = new Bottleneck.Group({
      maxConcurrent: 1, minTime: 100
    })
    var group2 = new Bottleneck.Group({
      maxConcurrent: 1, minTime: 100
    }, { timeout: 5000})

    c.mustEqual(group1.timeout, 300000)
    c.mustEqual(group2.timeout, 5000)

    var p1 = group1.updateSettings({ timeout: 123 })
    var p2 = group2.updateSettings({ timeout: 456 })
    return Promise.all([p1, p2])
    .then(function () {
      c.mustEqual(group1.timeout, 123)
      c.mustEqual(group2.timeout, 456)
    })
  })

  it('Should support keys() and limiters()', function () {
    c = makeTest()
    var group1 = new Bottleneck.Group({
      maxConcurrent: 1
    })
    var KEY_A = "AAA"
    var KEY_B = "BBB"

    group1.key(KEY_A).submit(c.job, null, 1)
    group1.key(KEY_B).submit(c.job, null, 2)

    var keys = group1.keys()
    var limiters = group1.limiters()
    c.mustEqual(keys, [KEY_A, KEY_B])
    c.mustEqual(limiters.length, 2)

    limiters.forEach(function (limiter, i) {
      c.mustEqual(limiter.key, keys[i])
      assert(limiter.limiter instanceof Bottleneck)
    })

  })

})
