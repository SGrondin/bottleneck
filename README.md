# bottleneck

[![Downloads][npm-downloads]][npm-url]
[![version][npm-version]][npm-url]
[![License][npm-license]][license-url]
[![Gitter][gitter-image]][gitter-url]


Bottleneck is a lightweight and efficient Task Scheduler and Rate Limiter for Node.js and the browser. When dealing with services with limited resources, it's important to ensure that they don't become overloaded.

Bottleneck is an easy solution as it does not add much complexity to your code.

It is battle-hardened, reliable and production-ready. [Hundreds of projects rely on it](https://github.com/SGrondin/bottleneck/network/dependents) and it is used on a large scale in private companies and open source software.

It also supports distributed applications through the new Clustering feature in v2.

__Bottleneck Version 2__

This new version is almost 100% compatible with v1 and adds powerful features such as:
- **True [Clustering](#clustering) support.** You can now rate limit and schedule jobs across multiple Node.js instances. It uses strictly atomic operations to stay reliable in the presence of unreliable clients. 100% of Bottleneck's features are supported.
- **Support for custom job _weights_.** Not all jobs are equally resource intensive.
- **Support for job expirations.** Bottleneck can automatically cancel jobs if they exceed their execution time limit.
- Many improvements to the interface, such as better method names and errors, improved debugging tools.

**[Quickly upgrade your application code from v1 to v2 of Bottleneck](#upgrading-to-v2)**

Bottleneck v2 targets Node v6.0 or newer, and evergreen browsers.

Bottleneck v1 targets ES5, which makes it compatible with any browser or Node version. It's still maintained, but it will not be receiving any new features. [Browse the v1 documentation](https://github.com/SGrondin/bottleneck/tree/version-1).

## Install

```
npm install --save bottleneck
```


### Quick Start

Most APIs have a rate limit. For example, to execute 3 requests per second:

```js
import Bottleneck from "bottleneck"

const limiter = new Bottleneck({
  minTime: 333
});
```

If there's a chance some requests might take longer than 333ms and you want to prevent more than 1 request from running at a time, add `maxConcurrent: 1`.

```js
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333
});
```

Instead of this:

```js
someAsyncCall(arg1, arg2, callback);
```

Do this:

```js
limiter.submit(someAsyncCall, arg1, arg2, callback);
```

And now you can be assured that someAsyncCall will abide by your rate guidelines!

[More information about using Bottleneck with callbacks](#submit)

#### Promises example

Instead of this:
```js
myFunction(arg1, arg2)
.then((result) => { /* handle result */ })
```
Do this:
```js
limiter.schedule(() => myFunction(arg1, arg2))
.then((result) => { /* handle result */ })
```
Or this:
```js
const wrapped = limiter.wrap(myFunction)

wrapped(arg1, arg2)
.then((result) => { /* handle result */ })
```

[More information about using Bottleneck with promises](#schedule)

#### Remember...

Bottleneck builds a queue of jobs and executes them as soon as possible. All the jobs will be executed *in the order that they were received*. See [priorities](#job-options) if you wish to alter this behavior.

This is sufficient for the vast majority of applications. **Read the 'Gotchas' section** and you're good to go. Or keep reading to learn about all the fine tuning available for the more complex use cases.

##### Gotchas

* Make sure you're catching `error` events emitted by limiters! See [Debugging your application](#debugging-your-application)

* **When using `submit`**, if a callback isn't necessary, you must pass `null` or an empty function instead. It will not work otherwise.

* **When using `submit`**, make sure all the jobs will eventually complete by calling their callback (or have an [`expiration`](#job-options)). Again, even if you `submit`ted your job with a `null` callback , it still needs to call its callback. This is particularly important if you are using a `maxConcurrent` value that isn't `null` (unlimited), otherwise those uncompleted jobs will be clogging up the limiter and no new jobs will be able to run. It's safe to call the callback more than once, subsequent calls are ignored.

* **When using `schedule` or `wrap`**, make sure that all the jobs will eventually complete (resolving or rejecting) or have an [`expiration`](#job-options). This is very important if you are using a `maxConcurrent` value that isn't `null` (unlimited), otherwise those uncompleted jobs will be clogging up the limiter and no new jobs will be able to run.

* **Clustering** has its own share of gotchas. Read the [Clustering](#clustering) chapter carefully.


## Docs

### Constructor

```js
const limiter = new Bottleneck({ /* options */ });
```

Basic options:

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrent` | `null` (unlimited) | How many jobs can be running at the same time. |
| `minTime` | `0` (ms) | How long to wait after launching a job before launching another one. |
| `highWater` | `null` | How long can the queue get? When the queue length exceeds that value, the selected `strategy` is executed to shed the load. |
| `strategy` | `Bottleneck.strategy.LEAK` | Which strategy to use if the queue gets longer than the high water mark. [Read about strategies](#strategies). |
| `penalty` | `15 * minTime`, or `5000` when `minTime` is `null` | The `penalty` value used by the `Bottleneck.strategy.BLOCK` strategy. |
| `reservoir` | `null` (unlimited) | How many jobs can be executed before the limiter stops executing jobs. If `reservoir` reaches `0`, no jobs will be executed until it is no longer `0`. |


### submit()

Adds a job to the queue. This is the callback version of `schedule`.

```js
limiter.submit(someAsyncCall, arg1, arg2, callback);
```

`submit` can also accept some advanced options. See [Job Options](#job-options).

It's safe to mix `submit` and `schedule` in the same limiter.


### schedule()

Adds a job to the queue. This is the Promise version of `submit`.

```js
const fn = function(arg1, arg2) {
  return httpGet(arg1, arg2); // Here httpGet() returns a promise
};

limiter.schedule(fn, arg1, arg2)
.then((result) => {
  /* ... */
})
```

Simply put, `schedule` takes a function Fn and a list of arguments. Fn must return a promise. `schedule` returns a promise that will be executed according to the rate limits.

`schedule` can also accept some advanced options. See [Job Options](#job-options).

It's safe to mix `submit` and `schedule` in the same limiter.

Here's another example:

```js
// suppose that `http.get(url)` returns a promise

const url = "https://wikipedia.org";

limiter.schedule(() => http.get(url))
.then(response => console.log(response.body));
```

If your function does not return a promise, it needs to use `Promise.resolve` like so:

```js
// GOOD
limiter.schedule(() => Promise.resolve("This is a string"))
.then(data => console.log(data));

// INCORRECT!
limiter.schedule(() => "This is a string")
.then(data => console.log(data));
```

It's also possible to replace the Promise library used by Bottleneck:

```js
const Bottleneck = require("bottleneck");
const Promise = require("bluebird");

const limiter = new Bottleneck({
  /* other options... */
  Promise: Promise
});
```

### wrap()

Takes a function that returns a promise. Returns a function identical to the original, but rate limited.

```js
const wrapped = limiter.wrap(fn)

wrapped()
.then(function (result) {
  /* ... */
})
.catch(function (error) {
  // Bottleneck might need to fail the job even if the original function can never fail
})
```


### Job Options

`submit`, `schedule`, and `wrap` all accept advanced options.

```js
// Submit
limiter.submit(options, someAsyncCall, arg1, arg2, callback);

// Schedule
limiter.schedule(options, fn, arg1, arg2);

// Wrap
const wrapped = limiter.wrap(fn);
wrapped.withOptions(options, arg1, arg2);
```

| Option | Default | Description |
|--------|---------|-------------|
| `priority` | `5` | A priority between `0` and `9`. A job with a priority of `4` will _always_ be executed before a job with a priority of `5`. |
| `weight` | `1` | Must be an integer equal to or higher than `0`. The `weight` is what increases the number of running jobs (up to `maxConcurrent`, if using) and decreases the `reservoir` value (if using). |
| `expiration` | `null` (unlimited) | The number milliseconds a job has to finish. Jobs that take longer than their `expiration` will be failed with a `BottleneckError`. |
| `id` | `<no-id>` | You can give an ID to your jobs, for easier debugging. See [Debugging your application](#debugging-your-application). |

### Strategies

A strategy is a simple algorithm that is executed every time adding a job would cause the number of queued jobs to exceed `highWater`. See [Events](#events).

#### Bottleneck.strategy.LEAK
When adding a new job to a limiter, if the queue length reaches `highWater`, drop the oldest job with the lowest priority. This is useful when jobs that have been waiting for too long are not important anymore. If all the queued jobs are more important (based on their `priority` value) than the one being added, it will not be added.

#### Bottleneck.strategy.OVERFLOW_PRIORITY
Same as `LEAK`, except it will only drop jobs that are *less important* than the one being added. If all the queued jobs are as or more important than the new one, it will not be added.

#### Bottleneck.strategy.OVERFLOW
When adding a new job to a limiter, if the queue length reaches `highWater`, do not add the new job. This strategy totally ignores priority levels.

#### Bottleneck.strategy.BLOCK
When adding a new job to a limiter, if the queue length reaches `highWater`, the limiter falls into "blocked mode". All queued jobs are dropped and no new jobs will be accepted until the limiter unblocks. It will unblock after `penalty` milliseconds have passed without receiving a new job. `penalty` is equal to `15 * minTime` (or `5000` if `minTime` is `0`) by default and can be changed by calling `changePenalty()`. This strategy is ideal when bruteforce attacks are to be expected. This strategy totally ignores priority levels.


### Jobs lifecycle

1. **Received**. You new job has been added to your limiter. Bottleneck needs to check whether it can be accepted into the queue, based on your `highWater` setting.
2. **Queued**. Bottleneck has accepted your job, but it can not tell at what exact timestamp it will run yet, because it is dependent on previous jobs.
3. **Running**. Your job is not in the queue anymore, it will be executed after a delay computed according to your `minTime` setting.
4. **Executing**. Your job is executing its code.
5. **Done**. Your job has completed.

#### counts()

```js
const counts = limiter.counts();

console.log(counts);
/*
{
  RECEIVED: 0,
  QUEUED: 0,
  RUNNING: 0,
  EXECUTING: 0,
  DONE: 0
}
*/
```

Returns an object with the current number of jobs per status in the limiter.

**Note:** By default, Bottleneck does not keep track of DONE jobs, to save memory. You can enable that feature by passing `trackDoneStatus: true` as an option when creating a limiter.

#### jobStatus()

```js
console.log(limiter.jobStatus("some-job-id"));
// Example: QUEUED
```

Returns the status of the job with the provided job id. See [Job Options](#job-options). Returns `null` if no job with that id exist.

**Note:** By default, Bottleneck does not keep track of DONE jobs, to save memory. You can enable that feature by passing `trackDoneStatus: true` as an option when creating a limiter.

#### queued()

```js
const count = limiter.queued(priority);

console.log(count);
```

`priority` is optional. Returns the number of **Queued** jobs with the given `priority` level. Omitting the `priority` argument returns the total number of queued jobs in the limiter.

#### empty()

```js
if (limiter.empty()) {
  // do something...
}
```

Returns a boolean which indicates whether there are any **Received** or **Queued** jobs in the limiter.

#### running()

```js
limiter.running()
.then((count) => console.log(count));
```

Returns a promise that returns the *total weight* of the **Running** and **Executing** jobs in the Cluster.

#### check()

```js
limiter.check()
.then((wouldRunNow) => console.log(wouldRunNow));
```
Checks if a new job would be executed immediately if it was submitted now. Returns a promise that returns a boolean.


### Events

Event names: `error`, `empty`, `idle`, `dropped`, `depleted` and `debug`.

__error__
```js
limiter.on("error", function (error) {
  // This is where Bottleneck's errors end up.
})
```

By far the most common case for errors is uncaught exceptions in your application code. If the jobs you add to Bottleneck (through `submit`, `schedule`, `wrap`, etc.) don't catch their own exceptions, the limiter will emit an `error` event.

If using Clustering, errors thrown by the Redis client will emit an `error` event.

__empty__
```js
limiter.on("empty", function () {
  // This will be called when `limiter.empty()` becomes true.
})
```

__idle__
```js
limiter.on("idle", function () {
  // This will be called when `limiter.empty()` is `true` and `limiter.running()` is `0`.
})
```

__dropped__
```js
limiter.on("dropped", function (dropped) {
  // This will be called when a strategy was triggered.
  // The dropped request is passed to this event listener.
})
```

__depleted__
```js
limiter.on("depleted", function (empty) {
  // This will be called every time the reservoir drops to 0.
  // The `empty` (boolean) argument indicates whether `limiter.empty()` is currently true.
})
```

__debug__
```js
limiter.on("debug", function (message, data) {
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
The options are the same as the [limiter constructor](#constructor).

**Note:** This doesn't affect jobs already scheduled for execution.

For example, imagine that three 60-second jobs are added to a limiter at time T with `maxConcurrent: null` and `minTime: 2000`. The jobs will be launched at T seconds, T+2 seconds and T+4 seconds, respectively. If right after adding the jobs to Bottleneck, you were to call `limiter.updateSettings({ maxConcurrent: 1 });`, it won't change the fact that there will be 3 jobs running at the same time for roughly 60 seconds. **`updateSettings()` only affects jobs that have not yet been added.**

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

### stop()

The `stop()` method is used to safely shutdown a limiter. It prevents any new jobs from being added to the limiter and waits for all Executing jobs to complete.

```js
limiter.stop(options)
.then(() => {
  console.log("Shutdown completed!")
})
```

`stop()` returns a promise that resolves once all non-Executing (see [Jobs Lifecycle](#jobs-lifecycle)) jobs have been dropped (if using `dropWaitingJobs`) and once all the Executing jobs have completed.

| Option | Default | Description |
|--------|---------|-------------|
| `dropWaitingJobs` | `true` | When `true`, drop all the RECEIVED, QUEUED and RUNNING jobs. When `false`, allow those jobs to complete before resolving the Promise returned by this method. |
| `dropErrorMessage` | `This limiter has been stopped.` | The error message used to drop jobs when `dropWaitingJobs` is `true`. |
| `enqueueErrorMessage` | `This limiter has been stopped and cannot accept new jobs.` | The error message used to reject a job added to the limiter after `stop()` has been called. |

### chain()

* `limiter` : If another limiter is passed, tasks that are ready to be executed will be added to that other limiter. *Default: `null` (none)*

Suppose you have 2 types of tasks, A and B. They both have their own limiter with their own settings, but both must also follow a global limiter C:

```js
const limiterA = new Bottleneck( /* ...some settings... */ );
const limiterB = new Bottleneck( /* ...some different settings... */ );
const limiterC = new Bottleneck( /* ...some global settings... */ );
limiterA.chain(limiterC);
limiterB.chain(limiterC);
// Requests added to limiterA must follow the A and C rate limits.
// Requests added to limiterB must follow the B and C rate limits.
// Requests added to limiterC must follow the C rate limits.
```

To unchain, call `limiter.chain(null);`.


## Clustering

Clustering lets many limiters access the same shared state, stored in a Redis server or Redis cluster. Changes to the state are Atomic, Consistent and Isolated (and fully [ACID](https://en.wikipedia.org/wiki/ACID) with the right redis [Durability](https://redis.io/topics/persistence) configuration), to eliminate any chances of race conditions or state corruption. Your settings, such as `maxConcurrent`, `minTime`, etc., are shared across the whole cluster, which means—for example—that `{ maxConcurrent: 5 }` guarantees no more than 5 jobs can ever run at a time in the entire cluster of limiters. 100% of Bottleneck's features are supported in Clustering mode. Enabling Clustering is as simple as changing a few settings. It's also a convenient way to store or export state for later use.

##### Enabling Clustering

__IMPORTANT:__ Add `redis` or `ioredis` to your application's dependencies.
```bash
# To use https://github.com/NodeRedis/node_redis
npm install --save redis

# To use https://github.com/luin/ioredis
npm install --save ioredis
```

```js
const limiter = new Bottleneck({
  /* Some basic options */
  maxConcurrent: 5,
  minTime: 500
  id: "my-super-app" // Should be unique for every limiter in the same Redis db

  /* Clustering options */
  datastore: "redis", // or "ioredis"
  clearDatastore: false,
  clientOptions: {
    // Redis client options
    // For NodeRedis, see https://github.com/NodeRedis/node_redis#options-object-properties
    // For ioredis, see https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options

    host: "127.0.0.1",
    port: 6379
    // "db" is another useful option
  }
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `datastore` | `"local"` | Where the limiter stores its internal state. The default (`"local"`) keeps the state in the limiter itself. Set it to `"redis"` or `"ioredis"` to enable Clustering. |
| `clearDatastore` | `false` | When set to `true`, on initial startup, the limiter will wipe any existing Bottleneck state data on the Redis db. |
| `clientOptions` | `{}` | This object is passed directly to the redis client library you've selected. |
| `clusterNodes` | `null` | **ioredis only.** When `clusterNodes` is not null, the client will be instantiated by calling `new Redis.Cluster(clusterNodes, clientOptions)` instead of `new Redis(clientOptions)`. |
| `timeout` | `null` | The Redis TTL in milliseconds ([TTL](https://redis.io/commands/ttl)) for the keys created by the limiter. When `timeout` is set, the limiter's state will be automatically removed from Redis after `timeout` milliseconds of inactivity. **Note:** `timeout` is `300000` (5 minutes) by default when using a Group. |

###### `.ready()`

Since your limiter has to connect to Redis, and this operation takes time and can fail, you need to wait for your limiter to be connected before using it.

```js
const limiter = new Bottleneck({ /* ... */ })

limiter.ready()
.then(() => {
  // The limiter is ready
})
.catch((error) => {
  // The limiter couldn't start
})
```

The `.ready()` method also exists when using the `local` datastore, for code compatibility reasons: code written for `redis`/`ioredis` will also work with `local`.

###### `.disconnect(flush)`

This helper method disconnects the limiter's client from the Redis server.

```js
limiter.disconnect(true)
```

The `flush` argument is optional and defaults to `true`.

###### `.clients()`

If you need direct access to the redis clients, use `.clients()`:

```js
console.log(limiter.clients())
// { client: <Redis Client>, subscriber: <Redis Client> }
```

Just like `.ready()`, calling `.clients()` when using the `local` datastore won't fail, it just won't return anything.

##### Important considerations when Clustering

The first limiter connecting to Redis will store its constructor options ([Constructor](#constructor)) on Redis and all subsequent limiters will be using those settings. You can alter the constructor options used by all the connected limiters by calling `updateSettings`. The `clearDatastore` option instructs a new limiter to wipe any previous Bottleneck data, including previously stored settings.

Queued jobs are **NOT** stored on Redis. They are local to each limiter. Exiting the Node.js process will lose those jobs. This is because Bottleneck has no way to propagate the JS code to run a job across a different Node.js process than the one it originated on. Bottleneck doesn't keep track of the queue contents of the limiters on a cluster for performance and reliability reasons.

Due to the above, functionality relying on the queue length happen purely locally:
- Priorities are local. A higher priority job will run before a lower priority job **on the same limiter**. Another limiter on the cluster might run a lower priority before our higher priority one.
- (Assuming default priority levels) Bottleneck guarantees that jobs will be run in the order they were queued **on the same limiter**. Another limiter on the cluster might run a job queued later before ours runs.
- `highWater` and load shedding ([strategies](#strategies)) are per limiter. However, one limiter entering Blocked mode will put the entire cluster in Blocked mode until `penalty` milliseconds have passed. See [Strategies](#strategies).
- The `empty` event is triggered when the (local) queue is empty.
- The `idle` event is triggered when the (local) queue is empty *and* no jobs are currently running anywhere in the cluster.

You must work around these limitations in your application code if they are an issue to you.

The current design guarantees reliability and lets clients (limiters) come and go. Your application can scale up or down, and clients can be disconnected without issues.

It is **strongly recommended** that you give an `id` for every limiter since it is used to build the name of your limiter's Redis keys! Limiters with the same `id` inside the same Redis db will be sharing the same datastore!

It is **strongly recommended** that you set an `expiration` (See [Job Options](#job-options)) *on every job*, since that lets the cluster recover from crashed or disconnected clients. Otherwise, a client crashing while executing a job would not be able to tell the cluster to decrease its number of "running" jobs. By using expirations, those lost jobs are automatically cleared after the specified time has passed. Using expirations is essential to keeping a cluster reliable in the face of unpredictable application bugs, network hiccups, and so on.

Network latency between Node.js and Redis is not taken into account when calculating timings (such as `minTime`). To minimize the impact of latency, Bottleneck performs the absolute minimum number of state accesses. Keeping the Redis server close to your limiters will help you get a more consistent experience. Keeping the clients' server time consistent will also help.

It is **strongly recommended** to [set up an `error` listener](#events) on all your limiters and on your Groups.

Bottleneck does not guarantee that the concurrency will be spread evenly across limiters. With `{ maxConcurrent: 5 }`, it's absolutely possible for a single limiter to end up running 5 jobs simultaneously while the other limiters in the cluster sit idle. To spread the load, use the `.chain()` method:

```js
const clusterLimiter = new Bottleneck({ maxConcurrent: 5, datastore: 'redis' });
const limiter = new Bottleneck({ maxConcurrent: 1 });

limiter.chain(clusterLimiter);

clusterLimiter.ready()
.then(() => {
  // Any Node process can only run one job at a time.
  // Across the whole cluster, up to 5 jobs can run simultaneously.

  limiter.schedule( /* ... */ )
})
.catch((error) => { /* ... */ });
```

##### Additional Clustering information

- As of v2.7.0, each Group will create 2 connections to Redis, one for commands and one for pub/sub. All limiters within the Group will share those connections.
- Each standalone limiter has its own 2 connections.
- Redis connectivity errors trigger an `error` event on the owner of the connection (the Group or the limiter).
- Bottleneck is compatible with [Redis Clusters](https://redis.io/topics/cluster-tutorial) and Redis Sentinel, but you must use the `ioredis` datastore and pass the `clusterNodes` option.
- Bottleneck's data is stored in Redis keys starting with `b_`. It also uses pub/sub channels starting with `bottleneck_` It will not interfere with any other data stored on the server.
- Bottleneck loads a few Lua scripts on the Redis server using the `SCRIPT LOAD` command. These scripts only take up a few Kb of memory. Running the `SCRIPT FLUSH` command will cause any connected limiters to experience critical errors until a new limiter connects to Redis and loads the scripts again.
- The Lua scripts are highly optimized and designed to use as few resources (CPU, especially) as possible.

##### Groups and Clustering

- When using Groups, the `timeout` option is set to `300000` milliseconds by default.
- Call `group.disconnect()` to permanently close a Group's Redis connections. It takes an optional boolean argument, pass `false` to forcefully close the connections without waiting.
- If you are using a Group, the generated limiters automatically receive an `id` with the pattern `group-key-${KEY}`.


## Debugging your application

Debugging complex scheduling logic can be difficult, especially when priorities, weights, and network latency all interact.

If your application is not behaving as expected, start by making sure you're catching `error` [events emitted](#events) by your limiters and your Groups. Those errors are most likely uncaught exceptions from your application code.

To see exactly what a limiter is doing in real time, listen to the `debug` event. It contains detailed information about how the limiter is executing your code. Adding [job IDs](#job-options) to all your jobs makes the debug output more readable.

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

Some Promise libraries also support selective `catch()` blocks that only catch a specific type of error:

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

You can also set the constructor option `rejectOnDrop` to `false`, and Bottleneck will leave your failed jobs hanging instead of failing them.

## Group

The `Group` feature of Bottleneck manages many limiters automatically for you. It creates limiters dynamically and transparently.

Let's take a DNS server as an example of how Bottleneck can be used. It's a service that sees a lot of abuse and where incoming DNS requests need to be rate limited. Bottleneck is so tiny, it's acceptable to create one limiter for each origin IP, even if it means creating thousands of limiters. The `Group` feature is perfect for this use case. Create one Group and use the origin IP to rate limit each IP independently. Each call with the same key (IP) will be routed to the same underlying limiter. A Group is created like a limiter:


```js
const group = new Bottleneck.Group(options);
```

The `options` object will be used for every limiter created by the Group.

The Group is then used with the `.key(str)` method:

```js
// In this example, the key is an IP
group.key("77.66.54.32").submit(someAsyncCall, arg1, arg2, cb);
```

__key()__

* `str` : The key to use. All jobs added with the same key will use the same underlying limiter. *Default: `""`*

The return value of `.key(str)` is a limiter. If it doesn't already exist, it is generated for you. Calling `key()` is how limiters are created inside a Group.

Limiters that have been idle for longer than 5 minutes are deleted to avoid memory leaks, this value can be changed by passing a different `timeout` option, in milliseconds.

__on("created")__

```js
group.on("created", (limiter, key) => {
  console.log("A new limiter was created for key: " + key)

  // Prepare the limiter, for example we'll want to listen to its 'error' events!
  limiter.on("error", (err) => {
    // Handle errors here
  })

  //
  // ...other operations to be executed when a new limiter is created...
  //
})
```

Listening for the `created` event is the recommended way to set up a new limiter. Your event handler is executed before `key()` returns the newly created limiter.

__updateSettings()__

```js
const group = new Bottleneck.Group({ maxConcurrent: 2, minTime: 250 })
group.updateSettings({ minTime: 500 })
```

After executing the above commands, new limiters will be created with `{ maxConcurrent: 2, minTime: 500 }`.


__deleteKey()__

* `str`: The key for the limiter to delete.

Manually deletes the limiter at the specified key. This can be useful when the auto cleanup is turned off.


__keys()__

Returns an array containing all the keys in the Group.


__limiters()__

```js
const limiters = group.limiters()

console.log(limiters)
// [ { key: "some key", limiter: <limiter> }, { key: "some other key", limiter: <some other limiter> } ]
```

## Upgrading to v2

The internal algorithms essentially haven't changed from v1, but many small changes to the interface were made to introduce new features.

All the breaking changes:
- Bottleneck v2 uses ES6/ES2015. v1 will continue to use ES5 only.
- The Bottleneck constructor now takes an options object. See [Constructor](#constructor).
- Jobs take an optional options object. See [Job options](#job-options).
- Removed `submitPriority()`, use `submit()` with an options object instead.
- Removed `schedulePriority()`, use `schedule()` with an options object instead.
- The `rejectOnDrop` option is now `true` by default.
- Use `null` instead of `0` to indicate an unlimited `maxConcurrent` value.
- Use `null` instead of `-1` to indicate an unlimited `highWater` value.
- Renamed `changeSettings()` to `updateSettings()`, it now returns a promise to indicate completion. It takes the same options object as the constructor.
- Renamed `nbQueued()` to `queued()`.
- Renamed `nbRunning` to `running()`, it now returns its result using a promise.
- Removed `isBlocked()`.
- Changing the Promise library is now done through the options object like any other limiter setting.
- Removed `changePenalty()`, it is now done through the options object like any other limiter setting.
- Removed `changeReservoir()`, it is now done through the options object like any other limiter setting.
- Removed `stopAll()`. Use the `reservoir` feature to disable execution instead.
- `check()` now accepts an optional `weight` argument, and returns its result using a promise.
- The `Cluster` feature is now called `Group`. This is to distinguish it from the new v2 [Clustering](#clustering) feature.
- The `Group` constructor takes an options object to match the limiter constructor.
- Removed the `Group` `changeTimeout()` method. Use `updateSettings()` instead, it now takes an options object. See [Group](#group).

Version 2 is more user-friendly, powerful and reliable.

After upgrading your code, please take a minute to read the [Debugging your application](#debugging-your-application) chapter.


## Contributing

This README is always in need of improvements. If wording can be clearer and simpler, please consider forking this repo and submitting a Pull Request, or simply opening an issue.

Suggestions and bug reports are also welcome.

To work on the Bottleneck code, simply clone the repo, makes your changes to the files located in `src/` only, then run `./scripts/build.sh && npm test` to ensure that everything is set up correctly.

To speed up compilation time during development, run `./scripts/build.sh dev` instead. Make sure to build and test without `dev` before submitting a PR.

The tests must also pass in Clustering mode. You'll need a Redis server running on `127.0.0.1:6379`, then run `./scripts/build.sh && DATASTORE=redis npm test && DATASTORE=ioredis npm test`.

All contributions are appreciated and will be considered.

[license-url]: https://github.com/SGrondin/bottleneck/blob/master/LICENSE

[npm-url]: https://www.npmjs.com/package/bottleneck
[npm-license]: https://img.shields.io/npm/l/bottleneck.svg?style=flat
[npm-version]: https://img.shields.io/npm/v/bottleneck.svg?style=flat
[npm-downloads]: https://img.shields.io/npm/dm/bottleneck.svg?style=flat

[gitter-url]: https://gitter.im/SGrondin/bottleneck
[gitter-image]: https://img.shields.io/badge/Gitter-Join%20Chat-blue.svg?style=flat
