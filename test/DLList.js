describe('DLList', function () {

  it('Should be created and be empty', function () {
    var list = new DLList()
    console.assert(list.getArray().length === 0)
  })

  it('Should be possible to append once', function () {
    var list = new DLList()
    list.push(5)
    var arr = list.getArray()
    console.assert(arr.length === 1)
    console.assert(list.length === 1)
    console.assert(arr[0] === 5)
  })

  it('Should be possible to append multiple times', function () {
    var list = new DLList()
    list.push(5)
    list.push(6)
    var arr = list.getArray()
    console.assert(arr.length === 2)
    console.assert(list.length === 2)
    console.assert(arr[0] === 5)
    console.assert(arr[1] === 6)

    list.push(10)

    arr = list.getArray()
    console.assert(arr.length === 3)
    console.assert(list.length === 3)
    console.assert(arr[0] === 5)
    console.assert(arr[1] === 6)
    console.assert(arr[2] === 10)

  })

  it('Should be possible to shift an empty list', function () {
    var list = new DLList()
    console.assert(list.length === 0)
    console.assert(list.shift() === undefined)
    var arr = list.getArray()
    console.assert(arr.length === 0)
    console.assert(list.length === 0)
    console.assert(list.shift() === undefined)
    arr = list.getArray()
    console.assert(arr.length === 0)
    console.assert(list.length === 0)
  })

  it('Should be possible to append then shift once', function () {
    var list = new DLList()
    list.push(5)
    console.assert(list.length === 1)
    console.assert(list.shift() === 5)
    var arr = list.getArray()
    console.assert(arr.length === 0)
    console.assert(list.length === 0)
  })

  it('Should be possible to append then shift multiple times', function () {
    var list = new DLList()
    list.push(5)
    console.assert(list.length === 1)
    console.assert(list.shift() === 5)
    console.assert(list.length === 0)

    list.push(6)
    console.assert(list.length === 1)
    console.assert(list.shift() === 6)
    console.assert(list.length === 0)
  })

  it('Should pass a full test', function () {
    var list = new DLList()
    list.push(10)
    console.assert(list.length === 1)
    list.push("11")
    console.assert(list.length === 2)
    list.push(12)
    console.assert(list.length === 3)

    console.assert(list.shift() === 10)
    console.assert(list.length === 2)
    console.assert(list.shift() === "11")
    console.assert(list.length === 1)

    list.push(true)
    console.assert(list.length === 2)

    var arr = list.getArray()
    console.assert(arr[0] === 12)
    console.assert(arr[1] === true)
    console.assert(arr.length === 2)
  })

})