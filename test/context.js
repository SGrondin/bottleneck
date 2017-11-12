global.TEST = true
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

module.exports = function (options) {
  var mustEqual = function (a, b) {
    // if (Array.isArray(a)) {
    //   assert(Array.isArray(b))
    //   mustEqual(a.length, b.length)
    //   a.forEach(function (x, i) {
    //     mustEqual(x, b[i])
    //   })
    //   return true
    // }
    // if (a !== b) {
    //   console.log('Tried to assert', JSON.stringify(a), '===', JSON.stringify(b))
    // }
    // assert(a === b)
    var strA = JSON.stringify(a)
    var strB = JSON.stringify(b)
    if (strA !== strB) {
      console.log(strA + ' !== ' + strB, (new Error('').stack))
      assert(strA === strB)
    }
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
    job: function (err, ...result) {
      var cb = result.pop()
      calls.push({err: err, result: result, time: Date.now()-start})
      if (process.env.DEBUG) console.log(result, calls)
      cb.apply({}, [err].concat(result))
    },
    promise: function (err, ...result) {
      return new Promise(function (resolve, reject) {
        if (process.env.DEBUG) console.log('In c.promise. Result: ', result)
        calls.push({err: err, result: result, time: Date.now()-start})
        if (process.env.DEBUG) console.log(result, calls)
        if (err == null) {
          return resolve(result)
        } else {
          return reject(err)
        }
      })
    },
    pNoErrVal: function (promise, ...expected) {
      if (process.env.DEBUG) console.log('In c.pNoErrVal. Expected:', expected)
      promise.then(function (actual) {
        mustEqual(actual, expected)
      }).catch(function (err) {
        console.error(err)
      })
    },
    noErrVal: function (...expected) {
      return function (err, ...actual) {
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
