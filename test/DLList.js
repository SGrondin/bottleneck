var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')
var DLList = Bottleneck.DLList
var assert = require('assert')

describe('DLList', function () {

  it('Should be created and be empty', function () {
    var list = new DLList()
    assert(list.getArray().length === 0)
  })

  it('Should be possible to append once', function () {
    var list = new DLList()
    list.push(5)
    var arr = list.getArray()
    assert(arr.length === 1)
    assert(list.length === 1)
    assert(arr[0] === 5)
  })

  it('Should be possible to append multiple times', function () {
    var list = new DLList()
    list.push(5)
    list.push(6)
    var arr = list.getArray()
    assert(arr.length === 2)
    assert(list.length === 2)
    assert(arr[0] === 5)
    assert(arr[1] === 6)

    list.push(10)

    arr = list.getArray()
    assert(arr.length === 3)
    assert(list.length === 3)
    assert(arr[0] === 5)
    assert(arr[1] === 6)
    assert(arr[2] === 10)

  })

  it('Should be possible to shift an empty list', function () {
    var list = new DLList()
    assert(list.length === 0)
    assert(list.shift() === undefined)
    var arr = list.getArray()
    assert(arr.length === 0)
    assert(list.length === 0)
    assert(list.shift() === undefined)
    arr = list.getArray()
    assert(arr.length === 0)
    assert(list.length === 0)
  })

  it('Should be possible to append then shift once', function () {
    var list = new DLList()
    list.push(5)
    assert(list.length === 1)
    assert(list.shift() === 5)
    var arr = list.getArray()
    assert(arr.length === 0)
    assert(list.length === 0)
  })

  it('Should be possible to append then shift multiple times', function () {
    var list = new DLList()
    list.push(5)
    assert(list.length === 1)
    assert(list.shift() === 5)
    assert(list.length === 0)

    list.push(6)
    assert(list.length === 1)
    assert(list.shift() === 6)
    assert(list.length === 0)
  })

  it('Should pass a full test', function () {
    var list = new DLList()
    list.push(10)
    assert(list.length === 1)
    list.push("11")
    assert(list.length === 2)
    list.push(12)
    assert(list.length === 3)

    assert(list.shift() === 10)
    assert(list.length === 2)
    assert(list.shift() === "11")
    assert(list.length === 1)

    list.push(true)
    assert(list.length === 2)

    var arr = list.getArray()
    assert(arr[0] === 12)
    assert(arr[1] === true)
    assert(arr.length === 2)
  })

})