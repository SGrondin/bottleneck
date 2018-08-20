var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

if (process.env.DATASTORE === 'ioredis') {
  describe('IORedis-only', function () {
    var c

    afterEach(function () {
      c.limiter.disconnect(false)
    })

    it('Should connect in Redis Cluster mode', function () {
      c = makeTest({
        maxConcurrent: 2,
        clientOptions: {},
        clusterNodes: [{
          host: '127.0.0.1',
          port: 6379
        }]
      })

      c.mustEqual(c.limiter.datastore, 'ioredis')
      c.mustEqual(c.limiter._store.connection.client.nodes().length, 1)
    })
  })
}
