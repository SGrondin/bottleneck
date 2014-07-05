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
You do
```javascript
limiter.submit(someAsyncCall, arg1, arg2, argN, callback);
```
And now you can be assured that someAsyncCall will abide by your rate guidelines!

All the submitted requests will be executed *in order*.

#Docs

###Constructor
```var limiter = new Bottleneck(maxConcurrent, minTime, highWater, strategy);```

* maxConcurrent : How many requests can be running at the same time. *Default: 0 (unlimited)*
* minTime : How long to wait after launching a request before launching another one. *Default: 0ms*
* highWater : How long can the queue get? *Default: 0 (unlimited)*
* strategy : Which strategy use if the queue gets longer than the high water mark. *Default: `Bottleneck.strategy.LEAK`.*

###submit()

This adds a request to the queue, see the example above.

It returns `true` if the strategy was executed. Therefore it will always return `false` if `highWater` is set to 0.

**Note:** If a callback isn't necessary, you must pass `null` or an empty function instead.

Make sure that all the requests will eventually complete! This is very important if you are using a `maxConcurrent` value that isn't 0 (unlimited), otherwise those uncompleted requests will be clogging up the limiter and no new requests will be getting through. A way to do this is to use a timer that will always call the callback. It's safe to call the callback more than once, subsequent calls are ignored.

###strategies

A strategy is a simple algorithm that is executed every time `submit` would cause the queue to exceed `highWater`.

####Bottleneck.strategy.LEAK
When submitting a new request, if the queue length reaches `highWater`, drop the oldest request in the queue. This is useful when requests that have been waiting for too long are not important anymore.

####Bottleneck.strategy.OVERFLOW
When submitting a new request, if the queue length reaches `highWater`, do not add the new request.

####Bottleneck.strategy.BLOCK
When submitting a new request, if the queue length reaches `highWater`, the limiter falls into "blocked mode". No new requests will be accepted until it unblocks. It will unblock after `penalty` milliseconds have passed without receiving a new request. `penalty` is equal to `8 * minTime` by default and can be changed by calling `changePenalty()`. This strategy is ideal when bruteforce attacks are to be expected.


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

The main design goal for Bottleneck is to be extremely small and transparent to use. It's meant to add the least possible complexity to the code.

Let's take a DNS server as an example of how Bottleneck can be used. It's a service that sees a lot of abuse. Bottleneck is tiny, so it's not unreasonable to create one instance of it for each origin IP. The `BLOCK` strategy will then easily lock out abusers and prevent the server from being used for a [DNS amplification attack](http://blog.cloudflare.com/65gbps-ddos-no-problem).

Other times, the application acts as a client and Bottleneck is used to not overload the server. In those cases, it's often better to not set any `highWater` mark so that no request is ever lost.

As long as `highWater` is 0, all requests are assured to be executed at some point. Once again, when using a `maxConcurrent` value greater than 0, make sure that all requests will call the callback eventually.

-----

Most of the time, using Bottleneck is as simple as the first example above. However, when Bottleneck is used on a synchronous call, it (obviously) becomes asynchronous, so the returned value of that call can't be used directly. The following example should make it clear why.

This is the original code that we want to rate-limit:
```javascript
var req = http.request(options, function(res){
	//do stuff with res
});
req.write("some string", "utf8");
req.end();
```

The following code snippet will **NOT** work, because `http.request` is not executed synchronously therefore `req` doesn't contain the expected request object.
```javascript
// DOES NOT WORK
var req = limiter.submit(http.request, options, function(res){
	//do stuff with res
});
req.write("some string", "utf8");
req.end();
```

This is the right way to do it:
```javascript
limiter.submit(function(){
	var req = http.request(options, function(res){
		//do stuff with res
	});
	req.write("some string", "utf8");
	req.end();
}, null);
```

-----

Pull requests and suggestions are welcome.
