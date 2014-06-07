bottleneck
==========

Bottleneck is a simple and efficient Asynchronous Rate Limiter for Node.JS and the browser. When dealing with services with limited resources, it's important to ensure that they don't become overloaded. Bottleneck is the easiest solution as it doesn't add any complexity to the code.

Databases, file systems, network access, APIs, etc. are all services that can easily be overwhelmed.


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

// Wait at least 2000ms between each request.
// Never more than 1 request running at a time.
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
```new Bottleneck(maxNb, minTime, highWater, strategy);```

* maxNb : How many requests can be running at the same time. Default: 0 (unlimited)
* minTime : How long to wait after launching a request before launching another one. Default: 0ms
* highWater : How long can the queue get? Default: 0 (unlimited)
* strategy : Which strategy use if the queue gets longer than the high water mark. Default: Bottleneck.strategy.LEAK.

###submit()

This adds a request to the queue.

It returns true if the queue's length is under the high water mark, otherwise it returns false.

If a callback isn't necessary, you must pass ```null``` instead.

###strategies

####Bottleneck.strategy.LEAK
When submitting a new request, if the highWater mark is reached, drop the oldest request in the queue. This is useful when requests that have been waiting for too long are not important anymore.

####Bottleneck.strategy.OVERFLOW
When submitting a new request, if the highWater mark is reached, do not add that request. The ```submit``` call did nothing.


###stopAll()
```javascript
limiter.stopAll();
```
Cancels all queued up requests and prevents additonal requests from being submitted.

###changeSettings()
```javascript
limiter.changeSettings(maxNb, minTime, highWater, strategy)
```
Same parameters as the constructor, pass ```null``` to skip a parameter and keep it to its current value.
