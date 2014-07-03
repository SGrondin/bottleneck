bottleneck
==========

Bottleneck is a simple and efficient Asynchronous Rate Limiter for Node.JS and the browser. When dealing with services with limited resources, it's important to ensure that they don't become overloaded. Bottleneck is the easiest solution as it doesn't add any complexity to the code.


#Install

__Node__
```javascript
npm install bottleneck
```
__Browser__
```html
<script type="text/javascript" src="bottleneck.min.js"></script>
```

#Example

Most APIs have a rate limit. For example, the Reddit.com API limits programs to 1 request every 2 seconds.

```javascript
var Bottleneck = require("bottleneck"); //Node.JS only

// Never more than 1 request running at a time.
// Wait at least 2000ms between each request.
var limiter = new Bottleneck(1, 2000);
```

Instead of doing
```javascript
someAsyncCall(arg1, arg2, argN, callback);
```
You now do
```javascript
limiter.submit(someAsyncCall, arg1, arg2, argN, callback);
```
And now you can be assured that someAsyncCall will abide by your rate guidelines!

All the submitted requests will be executed *in order*.

#Docs

###Constructor
```new Bottleneck(maxConcurrent, minTime, highWater, strategy);```

* maxConcurrent : How many requests can be running at the same time. *Default: 0 (unlimited)*
* minTime : How long to wait after launching a request before launching another one. *Default: 0ms*
* highWater : How long can the queue get? *Default: 0 (unlimited)*
* strategy : Which strategy use if the queue gets longer than the high water mark. *Default: `Bottleneck.strategy.LEAK`.*

###submit()

This adds a request to the queue, see the example above.

It returns `true` if the strategy was executed. Therefore it will always return `false` if `highWater` is set to 0.

If a callback isn't necessary, you must pass `null` or an empty function instead.

Make sure that all the requests will eventually complete! This is very important if you are using a `maxConcurrent` value that isn't 0 (unlimited), otherwise those uncompleted requests will be clogging up the limiter and no new requests will be getting through. A way to do this is to use a timer that will always call the callback. It's safe to call the callback more than once, subsequent calls are ignored.

###strategies

####Bottleneck.strategy.LEAK
When submitting a new request, if the queue length reaches `highWater`, drop the oldest request in the queue. This is useful when requests that have been waiting for too long are not important anymore.

####Bottleneck.strategy.OVERFLOW
When submitting a new request, if the queue length reaches `highWater`, do not add the new request.

####Bottleneck.strategy.BLOCK
When submitting a new request, if the queue length reaches `highWater`, the limiter falls into "blocked mode". No new requests will be accepted until it unblocks. It will unblock after `penalty` milliseconds have passed without receiving a new request. `penalty` is equal to `5 * minTime` by default and can be changed by calling `changePenalty()`. This strategy is ideal when bruteforce attacks are to be expected.


###stopAll()
```javascript
limiter.stopAll();
```
Cancels all queued up requests and prevents additonal requests from being submitted.

###changeSettings()
```javascript
limiter.changeSettings(maxConcurrent, minTime, highWater, strategy);
```
Same parameters as the constructor, pass ```null``` to skip a parameter and keep it to its current value.

###changePenalty()
```javascript
limiter.changePenalty(penalty);
```
This changes the `penalty` value used by the BLOCK strategy.


# Thoughts

The main design goal for Bottleneck is to be extremely small and transparent for the developer. In services that see a lot of abuse such as DNS servers, it's not unreasonable to create one instance of Bottleneck for each origin IP. The `BLOCK` strategy will then easily lock out abusers and prevent the server from being used for a [DNS amplification attack](http://blog.cloudflare.com/65gbps-ddos-no-problem).

Other times, the application acts as a client and Bottleneck is used to not overload the server. In those cases, it's often better to not set any `highWater` mark so that no request is ever lost.

As long as `highWater` is 0, all requests are assured to be executed at some point. Once again, when using a `maxConcurrent` value greater than 0, make sure that all requests will call the callback eventually.

Pull requests and suggestions are welcome.
