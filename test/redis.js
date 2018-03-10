var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var assert = require('assert')
var packagejson = require('../package.json')

if (process.env.DATASTORE === 'redis') {
  describe('Redis-only', function () {
    var c

    afterEach(function () {
      c.limiter.disconnect(false)
    })

    it('Should error out if not ready', function () {
      c = makeTest({ maxConcurrent: 2 })

      return c.limiter.schedule({id: 1}, c.slowPromise, 100, null, 1)
      .then(function (result) {
        return Promise.reject('Should not have been ready')
      })
      .catch(function (err) {
        c.mustEqual(err.message, 'This limiter is not done connecting to Redis yet. Wait for the \'ready\' event to be triggered before submitting requests.')
        return Promise.resolve()
      })
    })

    it('Should publish running decreases', function () {
      c = makeTest({ maxConcurrent: 2 })
      var limiter2, p1, p2, p3, p4

      return c.limiter.ready()
      .then(function () {
        limiter2 = new Bottleneck({
          maxConcurrent: 2,
          datastore: 'redis'
        })
        return limiter2.ready()
      })
      .then(function () {
        p1 = c.limiter.schedule({id: 1}, c.slowPromise, 100, null, 1)
        p2 = c.limiter.schedule({id: 2}, c.slowPromise, 100, null, 2)

        return c.limiter.schedule({id: 0, weight: 0}, c.promise, null, 0)
      })
      .then(function () {
        p3 = limiter2.schedule({id: 3}, c.slowPromise, 100, null, 3)
        return p3
      })
      .then(c.last)
      .then(function (results) {
        c.checkResultsOrder([[0], [1], [2], [3]])
        c.checkDuration(200)

        // Also check that the version gets set
        return new Promise(function (resolve, reject) {
          limiter2._store.client.hget('b_settings', 'version', function (err, data) {
            if (err != null) return reject(err)
            c.mustEqual(data, packagejson.version)
            return resolve()
          })
        })
      })
      .then(function () {
        limiter2.disconnect(false)
      })
    })

    it('Should use shared settings', function () {
      c = makeTest({ maxConcurrent: 2 })
      var limiter2

      return c.limiter.ready()
      .then(function () {
        limiter2 = new Bottleneck({ maxConcurrent: 1, datastore: 'redis' })
        return limiter2.ready()
      })
      .then(function () {
        return Promise.all([
          limiter2.schedule(c.slowPromise, 100, null, 1),
          limiter2.schedule(c.slowPromise, 100, null, 2)
        ])
      })
      .then(function () {
        limiter2.disconnect(false)
        return c.last()
      })
      .then(function (results) {
        c.checkResultsOrder([[1], [2]])
        c.checkDuration(100)
      })
    })

    it('Should clear previous settings', function () {
      c = makeTest({ maxConcurrent: 2 })
      var limiter2

      return c.limiter.ready()
      .then(function () {
        limiter2 = new Bottleneck({ maxConcurrent: 1, datastore: 'redis', clearDatastore: true })
        return limiter2.ready()
      })
      .then(function () {
        return Promise.all([
          c.limiter.schedule(c.slowPromise, 100, null, 1),
          c.limiter.schedule(c.slowPromise, 100, null, 2)
        ])
      })
      .then(function () {
        limiter2.disconnect(false)
        return c.last()
      })
      .then(function (results) {
        c.checkResultsOrder([[1], [2]])
        c.checkDuration(200)
      })
    })

    it('Should safely handle connection failures', function (done) {
      c = makeTest()
      var limiter = new Bottleneck({ datastore: 'redis', clientOptions: { port: 1 }})

      limiter.ready()
      .catch(function (err) {
        assert(err != null)
        limiter.disconnect(false)
        done()
      })
    })

    it('Should chain local and distributed limiters (total concurrency)', function () {
      c = makeTest({ maxConcurrent: 3 })
      var limiter2 = new Bottleneck({ maxConcurrent: 1 })
      var limiter3 = new Bottleneck({ maxConcurrent: 2 })

      limiter2.chain(c.limiter)
      limiter3.chain(c.limiter)

      return c.limiter.ready()
      .then(function () {
        return Promise.all([
          limiter2.schedule(c.slowPromise, 100, null, 1),
          limiter2.schedule(c.slowPromise, 100, null, 2),
          limiter2.schedule(c.slowPromise, 100, null, 3),
          limiter3.schedule(c.slowPromise, 100, null, 4),
          limiter3.schedule(c.slowPromise, 100, null, 5),
          limiter3.schedule(c.slowPromise, 100, null, 6)
        ])
      })
      .then(c.last)
      .then(function (results) {
        c.checkDuration(300)
        c.checkResultsOrder([[1], [4], [5], [2], [6], [3]])

        assert(results.calls[0].time >= 100 && results.calls[0].time < 200)
        assert(results.calls[1].time >= 100 && results.calls[1].time < 200)
        assert(results.calls[2].time >= 100 && results.calls[2].time < 200)

        assert(results.calls[3].time >= 200 && results.calls[3].time < 300)
        assert(results.calls[4].time >= 200 && results.calls[4].time < 300)

        assert(results.calls[5].time >= 300 && results.calls[2].time < 400)
      })
    })

    it('Should chain local and distributed limiters (partial concurrency)', function () {
      c = makeTest({ maxConcurrent: 2 })
      var limiter2 = new Bottleneck({ maxConcurrent: 1 })
      var limiter3 = new Bottleneck({ maxConcurrent: 2 })

      limiter2.chain(c.limiter)
      limiter3.chain(c.limiter)

      return c.limiter.ready()
      .then(function () {
        return Promise.all([
          limiter2.schedule(c.slowPromise, 100, null, 1),
          limiter2.schedule(c.slowPromise, 100, null, 2),
          limiter2.schedule(c.slowPromise, 100, null, 3),
          limiter3.schedule(c.slowPromise, 100, null, 4),
          limiter3.schedule(c.slowPromise, 100, null, 5),
          limiter3.schedule(c.slowPromise, 100, null, 6)
        ])
      })
      .then(c.last)
      .then(function (results) {
        c.checkDuration(300)
        c.checkResultsOrder([[1], [4], [5], [2], [6], [3]])

        assert(results.calls[0].time >= 100 && results.calls[0].time < 200)
        assert(results.calls[1].time >= 100 && results.calls[1].time < 200)

        assert(results.calls[2].time >= 200 && results.calls[2].time < 300)
        assert(results.calls[3].time >= 200 && results.calls[3].time < 300)

        assert(results.calls[4].time >= 300 && results.calls[4].time < 400)
        assert(results.calls[5].time >= 300 && results.calls[2].time < 400)
      })
    })

    it('Should not allow Groups (will be implemented later)', function (done) {
      c = makeTest()
      var message = 'Groups do not currently support Clustering. This will be implemented in a future version. Please open an issue at https://github.com/SGrondin/bottleneck/issues if you would like this feature to be implemented.'

      try {
        var group = new Bottleneck.Group({
          datastore: 'redis',
          clearDatastore: true
        })
        done(new Error('Should not allow Groups with Clustering'))
      } catch (e) {
        if (e.message === message) {
          done()
        }
      }
    })
  })
}
