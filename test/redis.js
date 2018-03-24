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
        c.mustEqual(err.message, 'This limiter is not done connecting to Redis yet. Wait for the \'.ready()\' promise to resolve before submitting requests.')
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
          var settings_key = limiter2._store.scripts.update_settings.keys[0]
          limiter2._store.client.hget(settings_key, 'version', function (err, data) {
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

    it('Should use the limiter ID to build Redis keys', function () {
      c = makeTest()
      var randomId = c.limiter._randomIndex()
      var limiter = new Bottleneck({ id: randomId, datastore: 'redis', clearDatastore: true })

      return limiter.ready()
      .then(function () {
        var settings_key = limiter._store.scripts.update_settings.keys[0]
        assert(settings_key.indexOf(randomId) > 0)

        return new Promise(function (resolve, reject) {
          limiter._store.client.del(settings_key, function (err, data) {
            if (err != null) return reject(err)
            return resolve(data)
          })
        })

      })
      .then(function (deleted) {
        c.mustEqual(deleted, 1)
        limiter.disconnect(false)
      })
    })

    it('Should not fail when Redis data is missing', function () {
      c = makeTest()
      var limiter = new Bottleneck({ datastore: 'redis', clearDatastore: true })

      return limiter.ready()
      .then(function () {
        return limiter.running()
      })
      .then(function (running) {
        c.mustEqual(running, 0)
        var settings_key = limiter._store.scripts.update_settings.keys[0]

        return new Promise(function (resolve, reject) {
          limiter._store.client.del(settings_key, function (err, data) {
            if (err != null) return reject(err)
            return resolve(data)
          })
        })

      })
      .then(function (deleted) {
        c.mustEqual(deleted, 1) // Should be 1, since 1 key should have been deleted
        return limiter.running()
      })
      .then(function (running) {
        c.mustEqual(running, 0)
        limiter.disconnect(false)
      })
    })

    it('Should support Groups and expire Redis keys', function () {
      c = makeTest()
      var group = new Bottleneck.Group({
        datastore: 'redis',
        clearDatastore: true,
        minTime: 50
      }, { timeout: 200 })
      var limiter1
      var limiter2
      var limiter3

      var limiterKeys = function (limiter) {
        return limiter._store.scripts.init.keys
      }
      var keysExist = function (keys) {
        return new Promise(function (resolve, reject) {
          return c.limiter._store.client.exists(...keys, function (err, data) {
            if (err != null) {
              return reject(err)
            }
            return resolve(data)
          })
        })
      }
      var t0 = Date.now()
      var results = {}
      var job = function (x) {
        results[x] = Date.now() - t0
        return Promise.resolve()
      }

      return c.limiter.ready()
      .then(function () {
        limiter1 = group.key('one')
        limiter2 = group.key('two')
        limiter3 = group.key('three')

        return Promise.all([limiter1.ready(), limiter2.ready(), limiter3.ready()])
      })
      .then(function () {
        return keysExist(
          [].concat(limiterKeys(limiter1), limiterKeys(limiter2), limiterKeys(limiter3))
        )
      })
      .then(function (exist) {
        c.mustEqual(exist, 3)
        return Promise.all([
          limiter1.schedule(job, 'a'),
          limiter1.schedule(job, 'b'),
          limiter1.schedule(job, 'c'),
          limiter2.schedule(job, 'd'),
          limiter2.schedule(job, 'e'),
          limiter3.schedule(job, 'f')
        ])
      })
      .then(function () {
        c.mustEqual(Object.keys(results).length, 6)
        assert(results.a < results.b)
        assert(results.b < results.c)
        assert(results.b - results.a >= 40)
        assert(results.c - results.b >= 40)

        assert(results.d < results.e)
        assert(results.e - results.d >= 40)

        assert(Math.abs(results.a - results.d) <= 10)
        assert(Math.abs(results.d - results.f) <= 10)
        assert(Math.abs(results.b - results.e) <= 10)

        return c.wait(300)
      })
      .then(function () {
        return keysExist(
          [].concat(limiterKeys(limiter1), limiterKeys(limiter2), limiterKeys(limiter3))
        )
      })
      .then(function (exist) {
        c.mustEqual(exist, 0)
      })
      .then(function () {
        group.keys().forEach(function (key) {
          group.key(key).disconnect(false)
        })
      })

    })

  })
}
