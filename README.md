# bottleneck

[![Downloads][npm-downloads]][npm-url]
[![version][npm-version]][npm-url]
[![License][npm-license]][license-url]
[![Gitter][gitter-image]][gitter-url]

Bottleneck is a tiny and efficient Asynchronous Rate Limiter for Node.JS and the browser. When dealing with services with limited resources, it's important to ensure that they don't become overloaded.

Bottleneck is the easiest solution as it doesn't add any complexity to the code.

It's battle-hardened, reliable and production-ready. [DNSChain](https://github.com/okTurtles/dnschain) uses it to serve millions of queries per day.


## Install

__Node__
```
npm install bottleneck
```
__Browser__
```
bower install bottleneck
```
or
```html
<script type="text/javascript" src="bottleneck.min.js"></script>
```

###### Example

Most APIs have a rate limit. For example, the Reddit.com API limits programs to 1 request every 2 seconds.

```js
var Bottleneck = require("bottleneck"); //Node only

// Never more than 1 request running at a time.
// Wait at least 2000ms between each request.
var limiter = new Bottleneck(1, 2000);
```

Instead of doing
```js
someAsyncCall(arg1, arg2, argN, callback);
```
You do
```js
limiter.submit(someAsyncCall, arg1, arg2, argN, callback);
```
And now you can be assured that someAsyncCall will abide by your rate guidelines!

Promise users can use [`schedule()`](https://github.com/SGrondin/bottleneck#schedule).

Bottleneck builds a queue of requests and executes them as soon as possible. All the requests will be executed *in order*.

This is sufficient for the vast majority of applications. **Read the [Gotchas](https://github.com/SGrondin/bottleneck#gotchas) section** and you're good to go. Or keep reading to learn about all the fine tuning available for the more complex use cases.


## Docs

### Constructor

```js
var limiter = new Bottleneck(maxConcurrent, minTime, highWater, strategy);
```

* `maxConcurrent` : How many requests can be running at the same time. *Default: `0` (unlimited)*
* `minTime` : How long to wait after launching a request before launching another one. *Default: `0`ms*
* `highWater` : How long can the queue get? *Default: `0` (unlimited)*
* `strategy` : Which strategy to use if the queue gets longer than the high water mark. *Default: `Bottleneck.strategy.LEAK`.*


### submit()

Adds a request to the queue.

```js
limiter.submit(someAsyncCall, arg1, arg2, argN, callback);
```

It returns `true` if the strategy was executed.

### schedule()

Adds a request to the queue. This is the Promise version of `submit`. It uses the [bluebird](https://github.com/petkaantonov/bluebird) package if available and otherwise uses the built-in [Promise](http://caniuse.com/#feat=promises) object.

```js
var fn = function(arg1, arg2, argN) {
	return httpGet(arg1, arg2, argN); // Here httpGet() returns a promise
};

limiter.schedule(fn, arg1, arg2, argN);
```

In plain language, `schedule` takes a function fn and a list of arguments. Fn must return a promise. `schedule` returns a promise that will be executed according to the rate limits. It's safe to mix `submit` and `schedule` in the same limiter.

Here's another example, this time using the ECMAScript 7 syntax:

```js
// fn returns a promise
function fn (url) {
    return http.get(url).then(response => console.log(response.body));
}

limiter.schedule(fn, url);
```

It's also possible to replace the Promise library used:

```js
var Bottleneck = require("bottleneck");
Bottleneck.Promise = myPromiseLibrary;

var limiter = new Bottleneck(maxConcurrent, minTime, highWater, strategy);
```

## Gotchas

* When using `submit`, if a callback isn't necessary, you must pass `null` or an empty function instead. It will not work if you forget to do this.

* Make sure that all the requests will eventually complete by calling their callback (or resolving/rejecting in the case of promises). Again, even if you `submit`ted your request with a `null` callback , it still needs to call its callback. This is very important if you are using a `maxConcurrent` value that isn't `0` (unlimited), otherwise those uncompleted requests will be clogging up the limiter and no new requests will be getting through. It's safe to call the callback more than once, subsequent calls are ignored.

* If you want to rate limit a synchronous function (console.log(), for example), you must wrap it in a closure to make it asynchronous. See [this](https://github.com/SGrondin/bottleneck#rate-limiting-synchronous-functions) example.

### strategies

A strategy is a simple algorithm that is executed every time adding a request would cause the queue's length to exceed `highWater`.

#### Bottleneck.strategy.LEAK
When submitting a new request, if the queue length reaches `highWater`, drop the oldest request in the queue. This is useful when requests that have been waiting for too long are not important anymore.

#### Bottleneck.strategy.OVERFLOW
When submitting a new request, if the queue length reaches `highWater`, do not add the new request.

#### Bottleneck.strategy.BLOCK
When submitting a new request, if the queue length reaches `highWater`, the limiter falls into "blocked mode". All queued requests are dropped and no new requests will be accepted into the queue until the limiter unblocks. It will unblock after `penalty` milliseconds have passed without receiving a new request. `penalty` is equal to `15 * minTime` (or `5000` if `minTime` is `0`) by default and can be changed by calling `changePenalty()`. This strategy is ideal when bruteforce attacks are to be expected.


### check()

```js
limiter.check();
```
If a request was added right now, would it be run immediately? Returns a boolean.

### isBlocked()

```js
limiter.isBlocked();
```
Is the limiter currently in "blocked mode"? Returns a boolean.


### stopAll()

```js
limiter.stopAll(interrupt);
```
Cancels all *queued up* requests and prevents additonal requests from being added.

* `interrupt` : If true, prevent the requests currently running from calling their callback when they're done. *Default: `false`*


### changeSettings()

```js
limiter.changeSettings(maxConcurrent, minTime, highWater, strategy);
```
Same parameters as the constructor, pass ```null``` to skip a parameter and keep it to its current value.

**Note:** Changing `maxConcurrent` and `minTime` will not affect requests that have already been scheduled for execution.

For example, imagine that 3 60-second requests are submitted at time T+0 with `maxConcurrent = 0` and `minTime = 2000`. The requests will be launched at T+0 seconds, T+2 seconds and T+4 seconds respectively. If right after adding the requests to Bottleneck, you were to call `limiter.changeSettings(1);`, it won't change the fact that there will be 3 requests running at the same time for roughly 60 seconds. Once again, `changeSettings` only affects requests that have not yet been added.

This is by design, as Bottleneck made a promise to execute those requests according to the settings valid at the time. Changing settings afterwards should not break previous assumptions, as that would make code very error-prone and Bottleneck a tool that cannot be relied upon.


### changePenalty()

```js
limiter.changePenalty(penalty);
```
This changes the `penalty` value used by the `BLOCK` strategy.


### changeReservoir(), incrementReservoir()

```js
limiter.changeReservoir(reservoir);

limiter.incrementReservoir(incrementBy);
```
* `reservoir` : How many requests can be executed before the limiter stops executing requests. *Default: `null` (unlimited)*

If `reservoir` reaches `0`, no new requests will be executed until it is no more `0`

### chain()

* `limiter` : If another limiter is passed, tasks that are ready to be executed will be added to that other limiter. *Default: `null` (none)*

Suppose you have 2 types of tasks, A and B. They both have their own limiter with their own settings, but both must also follow a global limiter C:
```js
var limiterA = new Bottleneck(...some settings...);
var limiterB = new Bottleneck(...some different settings...);
var limiterC = new Bottleneck(...some global settings...);
limiterA.chain(limiterC);
limiterB.chain(limiterC);
// Requests added to limiterA must follow the A and C rate limits.
// Requests added to limiterB must follow the B and C rate limits.
// Requests added to limiterC must follow the C rate limits.
```

## Execution guarantee

Bottleneck will execute every request in order. They will **all** *eventually* be executed as long as:

* `highWater` is set to `0` (default), which prevents the strategy from ever being run.
* `maxConcurrent` is set to `0` (default) **OR** all requests call the callback *eventually* (in the case of promises, they must be resolved or rejected eventually).
* `reservoir` is `null` (default).


## Cluster

The `Cluster` feature of Bottleneck manages many limiters automatically for you. It creates limiters dynamically and transparently.

Let's take a DNS server as an example of how Bottleneck can be used. It's a service that sees a lot of abuse and where incoming DNS requests need to be rate limited. Bottleneck is so tiny, it's perfectly fine to create one limiter for each origin IP, even if it means creating thousands and thousands of limiters. The `Cluster` mode is perfect for this use case. We can create one cluster and then use the origin IP to rate limit each IP independently. Each call with the same key will be routed to the same underlying limiter. A cluster is created exactly like a limiter:


```js
var cluster = new Bottleneck.Cluster(maxConcurrent, minTime, highWater, strategy);
```

The cluster is then used with the `.key(str)` method:

```js
// In this example, the key is an IP
cluster.key("77.66.54.32").submit(someAsyncCall, arg1, arg2, cb);
```

### key()

* `str` : The key to use. All calls submitted with the same key will use the same limiter. *Default: `""`*

The return value of `.key(str)` is a limiter. If it doesn't already exist, it is created on the fly. Limiters that have been idle for a long time are deleted to avoid memory leaks.

### stopAutoCleanup()

Calling `stopAutoCleanup()` on a cluster will turn off its garbage collection, so limiters for keys that have not been used in over **5 minutes** will NOT be deleted anymore. It can be reenabled by calling `startAutoCleanup()`.

### startAutoCleanup()

Reactivate the cluster's garbage collection for limiters (in the cluster) that have been inactive for over 5 minutes.

### deleteKey()

* `str`: The key for the limiter to delete.

Manually deletes the limiter at the specified key. This can be useful when the auto cleanup is turned off.

### all()

* `cb` : A function to be executed on every limiter in the cluster.

For example, this will call `stopAll()` on every limiter in the cluster:

```javasript
cluster.all(function(limiter){
  limiter.stopAll();
});
```

### keys()

Returns an array containing all the keys in the cluster.

## Rate-limiting synchronous functions

Most of the time, using Bottleneck is as simple as the first example above. However, when Bottleneck is used on a synchronous call, it (obviously) becomes asynchronous, so the returned value of that call can't be used directly. The following example should make it clear why.

This is the original code that we want to rate-limit:
```js
var req = http.request(options, function(res){
  //do stuff with res
});
req.write("some string", "utf8");
req.end();
```

The following code snippet will **NOT** work, because `http.request` is not executed synchronously therefore `req` doesn't contain the expected request object.
```js
// DOES NOT WORK
var req = limiter.submit(http.request, options, function(res){
  //do stuff with res
});
req.write("some string", "utf8");
req.end();
```

This is the right way to do it:
```js
limiter.submit(function(cb){
  var req = http.request(options, function(res){
    //do stuff with res
    cb();
  });
  req.write("some string", "utf8");
  req.end();
}, null);
```

## Contributing

This README file is always in need of better explanations and examples. If things can be clearer and simpler, please consider forking this repo and submitting a Pull Request.

Suggestions and bug reports are also welcome.

[license-url]: https://github.com/SGrondin/bottleneck/blob/master/LICENSE

[npm-url]: https://www.npmjs.com/package/bottleneck
[npm-license]: https://img.shields.io/npm/l/bottleneck.svg?style=flat
[npm-version]: https://img.shields.io/npm/v/bottleneck.svg?style=flat
[npm-downloads]: https://img.shields.io/npm/dm/bottleneck.svg?style=flat

[gitter-url]: https://gitter.im/SGrondin/bottleneck
[gitter-image]: https://img.shields.io/badge/Gitter-Join%20Chat-blue.svg?style=flat
