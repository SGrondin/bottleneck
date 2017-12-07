var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')

describe('Cluster', function () {
  var c

  afterEach(function () {
    if (c.limiter.datastore === 'redis') {
      c.limiter.disconnect(false)
    }
  })

  it('Should make Clusters', function (done) {
    c = makeTest()
    var cluster = new Bottleneck.Cluster({
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

    cluster.key('A').schedule(job, 1, 2)
    cluster.key('A').schedule(job, 3)
    cluster.key('A').schedule(job, 4)
    setTimeout(function () {
      cluster.key('B').schedule(job, 5)
    }, 20)
    setTimeout(function () {
      cluster.key('C').schedule(job, 6)
      cluster.key('C').schedule(job, 7)
    }, 40)

    cluster.key('A').submit(function (cb) {
      c.mustEqual(results, [[1,2], [5], [6], [3], [7], [4]])
      cb()
      done()
    }, null)
  })

  it('Should pass error on failure', function (done) {
    var failureMessage = 'SOMETHING BLEW UP!!'
    c = makeTest()
    var cluster = new Bottleneck.Cluster({
      maxConcurrent: 1, minTime: 100
    })
    c.mustEqual(Object.keys(cluster.limiters), [])

    var results = []

    var job = function (...result) {
      results.push(result)
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          return resolve()
        }, 50)
      })
    }

    cluster.key('A').schedule(job, 1, 2)
    cluster.key('A').schedule(job, 3)
    cluster.key('A').schedule(job, 4)
    cluster.key('B').schedule(() => Promise.reject(new Error(failureMessage)))
    .catch(function (err) {
      results.push(['CAUGHT', err.message])
    })
    setTimeout(function () {
      cluster.key('C').schedule(job, 6)
      cluster.key('C').schedule(job, 7)
    }, 40)


    cluster.key('A').submit(function (cb) {
      c.mustEqual(results, [[1,2], ['CAUGHT', failureMessage], [6], [3], [7], [4]])
      cb()
      done()
    }, null)
  })

  it('Should update its settings', function () {
    c = makeTest()
    var cluster1 = new Bottleneck.Cluster({
      maxConcurrent: 1, minTime: 100
    })
    var cluster2 = new Bottleneck.Cluster({
      maxConcurrent: 1, minTime: 100
    }, { timeout: 5000})

    c.mustEqual(cluster1.timeout, 300000)
    c.mustEqual(cluster2.timeout, 5000)

    var p1 = cluster1.updateSettings({ timeout: 123 })
    var p2 = cluster2.updateSettings({ timeout: 456 })
    return Promise.all([p1, p2])
    .then(function () {
      c.mustEqual(cluster1.timeout, 123)
      c.mustEqual(cluster2.timeout, 456)
    })
  })

})
