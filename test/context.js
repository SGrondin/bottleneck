global.TEST = true
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

module.exports = function (options) {
  var mustEqual = function (a, b) {
      if (a !== b) {
        console.log('Tried to assert', a, '===', b)
      }
      assert(a === b)
    }

  // OTHERS
  var start = Date.now()
  var calls = []
  var limiter = new Bottleneck(options)
  var getResults = function () {
    return {
      elapsed: Date.now() - start,
      callsDuration: calls[calls.length - 1].time,
      calls: calls
    }
  }

  var context = {
    job: function (err, result, cb) {
      calls.push({err: err, result: result, time: Date.now()-start})
      if (process.env.DEBUG) console.log(result, calls)
      cb(err, result)
    },
    promise: function (err, result) {
      return new Bottleneck.Promise(function (resolve, reject) {
        calls.push({err: err, result: result, time: Date.now()-start})
        if (process.env.DEBUG) console.log(result, calls)
        if (err == null) {
          return resolve(result)
        } else {
          return reject(err)
        }
      })
    },
    pNoErrVal: function (promise, expected) {
      promise.then(function (actual) {
        mustEqual(actual, expected)
      }).catch(function () {
        mustEqual(false, "The promise failed")
      })
    },
    noErrVal: function (expected) {
      return function (err, actual) {
        mustEqual(err, null)
        mustEqual(actual, expected)
      }
    },
    last: function (cb) {
      limiter.submit(function (cb) {cb(null, getResults())}, cb)
    },
    limiter: limiter,
    mustEqual: mustEqual,
    mustExist: function (a) { assert(a != null) },
    results: getResults,
    checkResultsOrder: function (order) {
      for (var i = 0; i < Math.max(calls.length, order.length); i++) {
        mustEqual(order[i], calls[i].result)
      }
    },
    checkDuration: function (shouldBe) {
      var results = getResults()
      var min = shouldBe - 10
      var max = shouldBe + 50
      assert(results.callsDuration > min)
      assert(results.callsDuration < max)
    }
  }

  return context
}
