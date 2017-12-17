# bottleneck

[![Downloads][npm-downloads]][npm-url]
[![version][npm-version]][npm-url]
[![License][npm-license]][license-url]
[![Gitter][gitter-image]][gitter-url]

Bottleneck is a tiny and efficient Task Scheduler and Rate Limiter for Node.JS and the browser. When dealing with services with limited resources, it's important to ensure that they don't become overloaded. Bottleneck also makes scheduling asynchronous jobs easier.

Bottleneck is the easiest solution as it doesn't add much complexity to the code.

It's battle-hardened, reliable and production-ready. It's used on a large scale in both private companies and open source software.

It also supports distributed applications through the new Clustering feature in v2.

__Bottleneck Version 2__
This new major version was released in December 2017. It's almost 100% compatible with Version 1, but it adds some very interesting features such as:
- **True Clustering support.** You can now rate limit and schedule jobs across multiple Node.js instances. It uses strictly atomic operations to stay reliable in the presence of unreliable clients. 100% of Bottleneck's features are supported.
- **Support for custom job _weights_.** Not all jobs have to be considered equally resource intensive.
- **Support for job timeouts.** Bottleneck can automatically cancel jobs if they exceed their execution time limit.
- Many improvements to the interface, such as better method names and errors.

[Quickly upgrade your code from Version 1 to Version 2.](#upgrading-to-v2)

Version 1 is still maintained, but will not be receiving any new features. Browse the v1 documentation.

## Install

```
npm install --save bottleneck
```


### Quick Start

Most APIs have a rate limit. For example, the reddit.com API limits scripts to 1 request every 2 seconds.

```js
const Bottleneck = require("bottleneck");

// Never more than 1 request running at a time.
// Wait at least 2000ms between each request.
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 2000
});
```

Instead of doing
```js
someAsyncCall(arg1, arg2, callback);
```
You do
```js
limiter.submit(someAsyncCall, arg1, arg2, callback);
```
And now you can be assured that someAsyncCall will abide by your rate guidelines!

[More information about using Bottleneck with callbacks.](#submit)

#### Promises example

Instead of doing
```js
myFunction(arg1, arg2)
.then((result) => { /* handle result */ })
```
You do
```js
limiter.schedule((arg1, arg2) => { myFunction(arg1, arg2) }, arg1, arg2)
.then((result) => { /* handle result */ })
```
Or
```js
const throttledMyFunction = limiter.wrap(myFunction)

throttledMyFunction(arg1, arg2)
.then((result) => { /* handle result */ })
```

[More information about using Bottleneck with promises.](#schedule)

#### Remember...

Bottleneck builds a queue of jobs and executes them as soon as possible. All the jobs will be executed *in the order that they were received*. See [priorities](#priorities) if you wish to alter this behavior.

This is sufficient for the vast majority of applications. **Read the 'Gotchas' section** and you're good to go. Or keep reading to learn about all the fine tuning available for the more complex use cases.

##### Gotchas

* Make sure you're catching `error` events emitted by limiters! See [Debugging your application](#debugging-your-application)

* **When using `submit`**, if a callback isn't necessary, you must pass `null` or an empty function instead. It will not work if you forget to do this.

* **When using `submit`**, make sure that all the jobs will eventually complete by calling their callback. Again, even if you `submit`ted your job with a `null` callback , it still needs to call its callback. This is very important if you are using a `maxConcurrent` value that isn't `null` (unlimited), otherwise those uncompleted jobs will be clogging up the limiter and no new jobs will be able to run. It's safe to call the callback more than once, subsequent calls are ignored.

* **When using `schedule` or `wrap`**, make sure that all the jobs will eventually complete (resolving or rejecting). This is very important if you are using a `maxConcurrent` value that isn't `null` (unlimited), otherwise those uncompleted jobs will be clogging up the limiter and no new jobs will be able to run.

* **Clustering** has its own share of gotchas. Read the [Clustering](#clustering) chapter carefully.


## Docs

### Constructor

```js
const limiter = new Bottleneck(options);
```

Basic options:

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrent` | `null` (unlimited) | How many jobs can be running at the same time. |
| `minTime` | `0` (ms) | How long to wait after launching a job before launching another one. |
| `highWater` | `null` | How long can the queue get? When the queue length exceeds that value, the selected `strategy` is executed to shed the load. |
| `strategy` | `Bottleneck.strategy.LEAK` | Which strategy to use if the queue gets longer than the high water mark. [Read about strategies](#strategies) |
| `penalty` | `15 * minTime`, or `5000` when `minTime` is `null` | The `penalty` value used by the `Bottleneck.strategy.BLOCK` strategy. |
| `reservoir` | `null` (unlimited) | How many jobs can be executed before the limiter stops executing jobs. If `reservoir` reaches `0`, no jobs will be executed until it is no more `0`. |
| `rejectOnDrop` | `true` | When `true`, if a job is dropped by Bottleneck, it will fail with a `BottleneckError`. If the job was a promise it will be rejected. When set to `false`, the job will instead never complete. |


### submit()

Adds a job to the queue. This is the callback version of `schedule`.

```js
limiter.submit(someAsyncCall, arg1, arg2, argN, callback);
```

`submit` can also accept some advanced options. See [Job Options](#job-options).

It's safe to mix `submit` and `schedule` in the same limiter.


### schedule()

Adds a job to the queue. This is the Promise version of `submit`.

```js
const fn = function(arg1, arg2, argN) {
  return httpGet(arg1, arg2, argN); // Here httpGet() returns a promise
};

limiter.schedule(fn, arg1, arg2, argN)
.then((result) => {
  /* ... */
})
```

Simply, `schedule` takes a function Fn and a list of arguments. Fn must return a promise. `schedule` returns a promise that will be executed according to the rate limits.

`submit` can also accept some advanced options. See [Job Options](#job-options).

It's safe to mix `submit` and `schedule` in the same limiter.

Here's another example:

```js
// suppose that `http.get(url)` returns a promise

const url = "https://wikipedia.org";

limiter.schedule(() => http.get(url))
.then(response => console.log(response.body));
```

It's also possible to replace the Promise library used by Bottleneck:

```js
const Bottleneck = require("bottleneck");
const Bluebird = require("bluebird");

const limiter = new Bottleneck({
  /* other options... */
  Promise: Bluebird
});
```

### wrap()

Takes a function that returns a promise. Wrap returns a function that acts identically to the original one, but is rate limited.

```js
const wrapped = limiter.wrap(fn)

fn()
.then(function (result) {
  /* ... */
})
.catch(function (error) {
  // Bottleneck might need to return errors even if the original function can never fail
})
```


### Job Options

Both `submit` and `schedule` accept advanced options.

```js
// Submit
limiter.submit(options, someAsyncCall, arg1, arg2, argN, callback);

// Schedule
limiter.schedule(options, fn, arg1, arg2, argN);
```

| Option | Default | Description |
|--------|---------|-------------|
| `priority` | `5` | A priority between `0` and `9`. A job with a priority of `4` will **always** be executed before a job with a priority of `5`. |
| `weight` | `1` | Must be an integer equal to or higher than `0`. The `weight` is what increases the number of running jobs (up to `maxConcurrent`, if using) and decreases the `reservoir` value (if using). |
| `expiration` | `null` (unlimited) | Once a job starts running, how many milliseconds does it have to finish? Jobs that take longer than their `expiration` will be failed with a `BottleneckError`. |
| `id` | `<no-id>` | You can give an ID to your jobs, for easier debugging. See [Debugging your application](#debugging-your-application). |

### Strategies

A strategy is a simple algorithm that is executed every time adding a job would cause the number of queued jobs to exceed `highWater`. See [Events](#events).

#### Bottleneck.strategy.LEAK
When adding a new job to a limiter, if the queue length reaches `highWater`, drop the oldest job with the lowest priority. This is useful when jobs that have been waiting for too long are not important anymore. If all the queued up jobs are more important (based on their `priority` value) than the one being added, it won't be added.

#### Bottleneck.strategy.OVERFLOW_PRIORITY
Same as `LEAK`, except that it will only drop jobs that are *less important* than the one being added. If all the queued up jobs are as important or more than the new one, it won't be added.

#### Bottleneck.strategy.OVERFLOW
When adding a new job to a limiter, if the queue length reaches `highWater`, do not add the new job. This strategy totally ignores priority levels.

#### Bottleneck.strategy.BLOCK
When adding a new job to a limiter, if the queue length reaches `highWater`, the limiter falls into "blocked mode". All queued jobs are dropped and no new jobs will be accepted until the limiter unblocks. It will unblock after `penalty` milliseconds have passed without receiving a new job. `penalty` is equal to `15 * minTime` (or `5000` if `minTime` is `0`) by default and can be changed by calling `changePenalty()`. This strategy is ideal when bruteforce attacks are to be expected. This strategy totally ignores priority levels.


### queued()

```js
const count = limiter.queued(priority);

console.log(count);
```

`priority` is optional. Without that argument, it returns return the total number of jobs waiting to be executed, otherwise it only counts the number of jobs with that specific priority.

### running()

```js
limiter.running()
.then((count) => console.log(count));
```

Returns a promise that returns the number of jobs currently running in the limiter.

### check()

```js
limiter.check()
.then((wouldRunNow) => console.log(wouldRunNow));
```
If a job was added right now, would it be run immediately? Returns a promise that returns a boolean.


### Events

Event names: `error`, `empty`, `idle`, `dropped` and `debug`.

__error__
```js
limiter.on('error', function (error) {
  // This is where Bottleneck's errors end up.
})
```

By far the most common case for errors is uncaught exceptions in your application code. If the jobs you add to Bottleneck (through `submit`, `schedule`, `wrap`, etc.) don't catch their own exceptions, the limiter will emit an `error` event.

If using Clustering, errors thrown by the Redis client will emit an `error` event.

__empty__
```js
limiter.on('empty', function () {
  // This will be called when the queued() drops to 0.
})
```

__idle__
```js
limiter.on('idle', function () {
  // This will be called when the queued() drops to 0 AND there is nothing currently running in the limiter.
})
```

__dropped__
```js
limiter.on('dropped', function (dropped) {
  // This will be called when a strategy was triggered.
  // The dropped request is passed to this callback.
})
```

__debug__
```js
limiter.on('debug', function (message, data) {
  // Useful to figure out what the limiter is doing in real time
  // and to help debug your application
})
```

Use `removeAllListeners()` with an optional event name as first argument to remove listeners.

Use `.once()` instead of `.on()` to only receive a single event.


### updateSettings()

```js
limiter.updateSettings(options);
```
The options are the same as the [limiter instantiation](#constructor).

**Note:** This doesn't affect jobs already scheduled for execution.

For example, imagine that three 60-second jobs are added to a limiter at time T with `maxConcurrent: null` and `minTime: 2000`. The jobs will be launched at T seconds, T+2 seconds and T+4 seconds, respectively. If right after adding the jobs to Bottleneck, you were to call `limiter.updateSettings({ maxConcurrent: 1 });`, it won't change the fact that there will be 3 jobs running at the same time for roughly 60 seconds. **`updateSettings` only affects jobs that have not yet been added.**

This is by design, as Bottleneck made a promise to execute those requests according to the settings valid at the time.

### incrementReservoir()

```js
limiter.incrementReservoir(incrementBy);
```

This is a way to update the `reservoir` value other than calling `updateSettings`.

Returns a promise.

### currentReservoir()

```js
limiter.currentReservoir()
.then((reservoir) => console.log(reservoir));
```

Returns a promise that returns the current reservoir value.

### chain()

* `limiter` : If another limiter is passed, tasks that are ready to be executed will be added to that other limiter. *Default: `null` (none)*

Suppose you have 2 types of tasks, A and B. They both have their own limiter with their own settings, but both must also follow a global limiter C:

```js
var limiterA = new Bottleneck( /* ...some settings... */ );
var limiterB = new Bottleneck( /* ...some different settings... */ );
var limiterC = new Bottleneck( /* ...some global settings... */ );
limiterA.chain(limiterC);
limiterB.chain(limiterC);
// Requests added to limiterA must follow the A and C rate limits.
// Requests added to limiterB must follow the B and C rate limits.
// Requests added to limiterC must follow the C rate limits.
```


## Clustering

Clustering lets many limiters access the same shared state, stored in a Redis server or Redis cluster. Changes to the state are Atomic, Consistent and Isolated (and fully [ACID](https://en.wikipedia.org/wiki/ACID) with the right redis Durability configuration) to eliminate any chances of race conditions or corruption. Your settings, such as `maxConcurrent`, `minTime`, etc., are shared across the whole cluster, which means -for example- that `{ maxConcurrent: 5 }` guarantees no more than 5 jobs can ever run at the time across all the limiters connected to the cluster. 100% of Bottleneck's features are supported. Enabling Clustering is as simple as changing a few settings. Clustering is also a convenient way to store or export state for later use.

##### Enabling Clustering

__IMPORTANT:__ Add `redis` to your application's dependencies.
```
npm install --save redis
```

```js
const limiter = new Bottleneck({
  /* Some basic options */
  maxConcurrent: 5,
  minTime: 500

  /* Clustering options */
  datastore: "redis",
  cleaDatastore: false,
  clientOptions: {
    /* node-redis client options, passed to redis.createClient() */
    // See https://github.com/NodeRedis/node_redis#options-object-properties
    host: "127.0.0.1",
    port: 6379
    // "db" is another useful option
  }
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `datastore` | `"local"` | Where the limiter stores its internal state. The default (`local`) keeps the state in the limiter itself. Set it to `redis` to enable Clustering. |
| `clearDatastore` | `false` | When set to `true`, on initial startup, the limiter will wipe any existing Bottleneck state data on the Redis db. |
| `clientOptions` | `{}` | This object is passed directly to NodeRedis's `redis.createClient()` method. [See all the valid client options.](https://github.com/NodeRedis/node_redis#options-object-properties) |

##### Important considerations when Clustering

Queued jobs are **NOT** stored on Redis. Queued up jobs are local to the limiter. Exiting the Node.js process will lose those jobs. This is because Bottleneck has no way to propagate the JS code to run jobs across limiters. Bottleneck also cannot keep track of the queue contents of the limiters on a cluster, for performance reasons and because the reliability tradeoffs were too great.

For those reasons, functionality relying on the queue length, happen purely locally:
- Priorities are local. A higher priority job will run before a lower priority job **on the same limiter**. Another limiter on the cluster might run a lower priority before our higher priority one.
- (Assuming default priority levels) Bottleneck guarantees that jobs will be run in the order they were queued **on the same limiter**. Another limiter on the cluster might run a job queued later before ours.
- `highWater` and load shedding (through a strategy) are per limiter. However, one limiter entering Blocked mode will put the entire cluster in Blocked mode until `penalty` milliseconds have passed. See [Strategies](#strategies).

The above limitations should be possible to work around in your application code, if necessary.

The current design was chosen because it guarantees reliability and lets clients (limiters) come and go. Your application can scale up or down, and clients can be disconnected without issues.

It is **strongly recommended** that you set a `timeout` (See [Job Options](#job-options)) *on every job*, since that lets the cluster recover from crashed or disconnected clients. Otherwise, a client crashing while executing a job would not be able to tell the cluster to decrease its number of "running" jobs. By using timeouts, those lost jobs are automatically cleared after the timeout. Using timeouts is essential to a keeping a cluster reliable in the face of unpredictable bugs, network hiccups, and so on.

Bottleneck does not take network latency into account when calculating timings (such as `minTime`). Bottleneck keeps the number of state accesses to the minimum possible, but keeping the Redis server close to your limiters will help you get a more consistent experience.


##### Additional Clustering information

- Bottleneck is compatible with [Redis Clusters](https://redis.io/topics/cluster-tutorial).
- Bottleneck's data is stored in Redis keys beginning with `b_` and it uses the `bottleneck` pub/sub channel. It will not interfere with any other data stored on the server.
- Bottleneck loads a few Lua scripts on the Redis server using the `EVALSHA` command. Those scripts do not take up more than a few Kb of memory. Therefore running the `SCRIPT FLUSH` command will cause any connected limiters to experience critical errors until a new limiter connects to Redis and loads the scripts again.
- The Lua scripts are highly optimized and designed to use as little resources (especially CPU) as possible.
- [Chaining](#chain) limiters can help create complex designs when a `{ datastore: "local" }` limiter is chained to a `{ datastore: "redis" }` one or vice versa.


## Debugging your application

Debugging complex scheduling logic can be difficult, especially when priorities, weights, and network latency all interact together.

If your application is not behaving as expected, start by making sure you're catching `error` [events emitted](#events) by your limiters. Those errors are most likely uncaught exceptions from your application code.

To see exactly what a limiter is doing in real time, listen to the `debug` event. It contains detailed information about how the limiter is executing your code. Adding [job IDs](#job-options) to all your jobs makes the debug output a lot more readable.

When Bottleneck has to fail one of your jobs, it does so by using `BottleneckError` objects. This lets you tell those errors apart from your own code's errors:

```js
limiter.schedule(fn)
.then((result) => { /* ... */ } )
.catch((error) => {
  if (error instanceof Bottleneck.prototype.BottleneckError) {
    /* ... */
  }
})
```

Some Promise libraries also support selective `catch()` blocks that only catch a specific type of errors:

```js
limiter.schedule(fn)
.then((result) => { /* ... */ } )
.catch(Bottleneck.prototype.BottleneckError, (error) => {
  /* ... */
})
.catch((error) => {
  /* ... */
})
```

## Group

The `Group` feature of Bottleneck manages many limiters automatically for you. It creates limiters dynamically and transparently.

Let's take a DNS server as an example of how Bottleneck can be used. It's a service that sees a lot of abuse and where incoming DNS requests need to be rate limited. Bottleneck is so tiny, it's perfectly fine to create one limiter for each origin IP, even if it means creating thousands and thousands of limiters. The `Group` feature is perfect for this use case. We can create one group and then use the origin IP to rate limit each IP independently. Each call with the same key (IP) will be routed to the same underlying limiter. A group is created exactly like a limiter:


```js
var group = new Bottleneck.Group(maxConcurrent, minTime, highWater, strategy);
```

The group is then used with the `.key(str)` method:

```js
// In this example, the key is an IP
group.key("77.66.54.32").submit(someAsyncCall, arg1, arg2, cb);
```


__key()__

* `str` : The key to use. All jobs added with the same key will use the same underlying limiter. *Default: `""`*

The return value of `.key(str)` is a limiter. If it doesn't already exist, it is created on the fly. Limiters that have been idle for a long time are deleted to avoid memory leaks.


__stopAutoCleanup()__

Calling `stopAutoCleanup()` on a group will turn off its garbage collection, so limiters for keys that have not been used in over **5 minutes** will NOT be deleted anymore. It can be reenabled by calling `startAutoCleanup()`. The `5 minutes` figure can be modified by calling `updateTimeout()`.


__startAutoCleanup()__

Reactivate the group's garbage collection..

__updateSettings()__

```js
group.updateSettings({ timeout: 60000 })
```

* `timeout`: The expiration time for unused limiters, in milliseconds. By default it is `300000` (5 minutes).

When autocleanup is enabled, limiters having not been used in the last `timeout` milliseconds will be deleted to avoid memory leaks.


__deleteKey()__

* `str`: The key for the limiter to delete.

Manually deletes the limiter at the specified key. This can be useful when the auto cleanup is turned off.


__keys()__

Returns an array containing all the keys in the group.


__limiters()__

```js
const limiters = group.limiters()

console.log(limiters)
// [ { key: "some key", limiter: <limiter> }, { key: "some other key", limiter: <some other limiter> } ]
```

## Upgrading to v2

The internal algorithms essentially haven't changed, but many small changes to the interface had to be done to make the new features possible.

All the breaking changes:
- Bottleneck v2 uses ES6/ES2015. v1 will continue to use ES5 only.
- The Bottleneck constructor now takes an options object. See [Constructor](#constructor).
- Jobs take an optional options object. See [Job options](#job-options).
- Removed `submitPriority()`, use `submit()` with an options object instead.
- Removed `schedulePriority()`, use `schedule()` with an options object instead.
- The `rejectOnDrop` option is now `true` by default.
- Use `null` instead of `0` to indicate an unlimited `maxConcurrent` value.
- Use `null` instead of `-1` to indicate an unlimited `highWater` value.
- Renamed `changeSettings()` to `updateSettings()` and it now returns a promise to indicate completion. It takes the same options object as the constructor.
- Renamed `nbQueued()` to `queued()`.
- Renamed `nbRunning` to `running()`, it also now returns its result using a promise.
- Removed `isBlocked()`.
- Changing the Promise library is now done through the options object like any other limiter settings.
- Removed `changePenalty`, it is now done through the options object like any other limiter settings.
- Removed `changeReservoir, it is now done through the options object like any other limiter settings.
- Removed `stopAll()`, as its implementation was flawed and misleading. Use the `reservoir` feature to disable execution instead.
- `check()` now accepts an optional `weight` argument, and now also returns its result using a promise.
- The `Cluster` feature is now called `Group`. This is to distinguish it from the new v2 [Clustering](#clustering) feature.
- The `Group` constructor takes an options object, to match the limiter constructor.
- Renamed the `Group` `changeTimeout()` method to `updateSettings()`, it now takes an options object. See [Group](#group).

Version 2 is strictly superior: more user-friendly, powerful and reliable than ever.

After upgrading your code, please take a minute to read the [Debugging your application](#debugging-your-application) chapter.


## Contributing

This README file is always in need of improvements. If wording can be clearer and simpler, please consider forking this repo and submitting a Pull Request, or simply opening an issue.

Suggestions and bug reports are also welcome.

To work on the Bottleneck code, simply clone the repo, and run `./scripts/build.sh && npm test` to ensure that everything is set up correctly.

Make your changes to the files localted in `src/` only, then run `./scripts/build.sh && npm test` to compile and test them.

The tests must also pass in Clustering mode. You'll need a Redis server running on `127.0.0.1:6379`, then run `./scripts/build.sh && DATASTORE=redis npm test`.

[license-url]: https://github.com/SGrondin/bottleneck/blob/master/LICENSE

[npm-url]: https://www.npmjs.com/package/bottleneck
[npm-license]: https://img.shields.io/npm/l/bottleneck.svg?style=flat
[npm-version]: https://img.shields.io/npm/v/bottleneck.svg?style=flat
[npm-downloads]: https://img.shields.io/npm/dm/bottleneck.svg?style=flat

[gitter-url]: https://gitter.im/SGrondin/bottleneck
[gitter-image]: https://img.shields.io/badge/Gitter-Join%20Chat-blue.svg?style=flat
