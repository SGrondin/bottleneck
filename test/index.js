global.TEST = true
global.Bottleneck = require('../lib/index.js')
global.DLList = require('../lib/DLList.js')
global.makeTest = function (arg1, arg2, arg3, arg4, arg5) {
  // ASSERTION
  var asserts = 0
  var getAsserts = function () {
    return asserts
  }
  var assertWrapped = function (eq) {
      asserts++
      console.assert(eq)
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
        console.assert(order[i] === calls[i].result)
      }
    },
    checkDuration: function (shouldBe) {
      var results = getResults()
      var min = shouldBe - 10
      var max = shouldBe + 50
      console.assert(results.callsDuration > min)
      console.assert(results.callsDuration < max)
    }
  }

  return context
}

var fs = require('fs')
var files = fs.readdirSync('./test')
for (var f in files) {
  var stat = fs.statSync('./test/' + files[f])
  if (!stat.isDirectory()) {
    try {
      require('./' + files[f])
    } catch (e) {
      console.error(e.toString())
    }
  }
}
