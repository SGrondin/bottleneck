bottleneck
==========

Bottleneck is a very simple and efficient Asynchronous Rate Limiter for Node.JS. When dealing with services with limited resources, it's important to ensure that they don't become overloaded with requests. Bottleneck handles that case in a clean and simple way.


#Installation

__Node__
```javascript
npm install bottleneck
```
__Browser__
```html
<script type="text/javascript" src="bottleneck.min.js"></script>
```

#Usage

Most APIs have a rate limit. For example, the Reddit.com API limits programs to 1 request every 2 seconds.

```javascript
var Bottleneck = require("bottleneck"); //Ignore if Browser

// Wait at least 2000ms between each request. Never more than 1 request running at a time.
var limiter = new Bottleneck(1, 2000);
```

```new Bottleneck(maxNb, minTime);```

* maxNb : How many requests can be running at the same time. 0 means unlimited.
* minTime : How long to wait between each request.


Instead of doing
```javascript
someAsyncCall(arg1, arg2, callback);
```
You do
```javascript
limiter.submit(someAsyncCall, ar1, arg2, callback);
```
And now you can be assured that someAsyncCall will follow the rate guidelines!

###stopAll
```javascript
limiter.stopAll();
```
stopAll cancels all queued up requests and prevents additonal requests from being submitted.


