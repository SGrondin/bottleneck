global.TEST = true
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

module.exports = function (arg1, arg2, arg3, arg4, arg5) {
  // ASSERTION
  var asserts = 0
  var getAsserts = function () {
    return asserts
  }
  var assertWrapped = function (eq) {
      asserts++
      assert(eq)
    }

  // OTHERS
  var start = Date.now()
  var calls = []
  var limiter = new Bottleneck(arg1, arg2, arg3, arg4, arg5)
  var getResults = function () {
    return {
      elapsed: Date.now() - start,
      callsDuration: calls[calls.length - 1].time,
      calls: calls,
      asserts: asserts
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
        assertWrapped(actual === expected)
      }).catch(function () {
        assertWrapped(false === "The promise failed")
      })
    },
    noErrVal: function (expected) {
      return function (err, actual) {
        assertWrapped(err === null)
        assertWrapped(actual === expected)
      }
    },
    last: function (cb) {
      limiter.submit(function (cb) {cb(null, getResults())}, cb)
    },
    limiter: limiter,
    assert: assertWrapped,
    asserts: getAsserts,
    results: getResults,
    checkResultsOrder: function (order) {
      for (var i = 0; i < Math.max(calls.length, order.length); i++) {
        assert(order[i] === calls[i].result)
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
