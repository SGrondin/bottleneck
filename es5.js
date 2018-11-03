(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Bottleneck = factory());
}(this, (function () { 'use strict';

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	function getCjsExportFromNamespace (n) {
		return n && n.default || n;
	}

	var runtime = createCommonjsModule(function (module) {
	/**
	 * Copyright (c) 2014-present, Facebook, Inc.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	!(function(global) {

	  var Op = Object.prototype;
	  var hasOwn = Op.hasOwnProperty;
	  var undefined; // More compressible than void 0.
	  var $Symbol = typeof Symbol === "function" ? Symbol : {};
	  var iteratorSymbol = $Symbol.iterator || "@@iterator";
	  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
	  var runtime = global.regeneratorRuntime;
	  if (runtime) {
	    {
	      // If regeneratorRuntime is defined globally and we're in a module,
	      // make the exports object identical to regeneratorRuntime.
	      module.exports = runtime;
	    }
	    // Don't bother evaluating the rest of this file if the runtime was
	    // already defined globally.
	    return;
	  }

	  // Define the runtime globally (as expected by generated code) as either
	  // module.exports (if we're in a module) or a new, empty object.
	  runtime = global.regeneratorRuntime = module.exports;

	  function wrap(innerFn, outerFn, self, tryLocsList) {
	    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	    var generator = Object.create(protoGenerator.prototype);
	    var context = new Context(tryLocsList || []);

	    // The ._invoke method unifies the implementations of the .next,
	    // .throw, and .return methods.
	    generator._invoke = makeInvokeMethod(innerFn, self, context);

	    return generator;
	  }
	  runtime.wrap = wrap;

	  // Try/catch helper to minimize deoptimizations. Returns a completion
	  // record like context.tryEntries[i].completion. This interface could
	  // have been (and was previously) designed to take a closure to be
	  // invoked without arguments, but in all the cases we care about we
	  // already have an existing method we want to call, so there's no need
	  // to create a new function object. We can even get away with assuming
	  // the method takes exactly one argument, since that happens to be true
	  // in every case, so we don't have to touch the arguments object. The
	  // only additional allocation required is the completion record, which
	  // has a stable shape and so hopefully should be cheap to allocate.
	  function tryCatch(fn, obj, arg) {
	    try {
	      return { type: "normal", arg: fn.call(obj, arg) };
	    } catch (err) {
	      return { type: "throw", arg: err };
	    }
	  }

	  var GenStateSuspendedStart = "suspendedStart";
	  var GenStateSuspendedYield = "suspendedYield";
	  var GenStateExecuting = "executing";
	  var GenStateCompleted = "completed";

	  // Returning this object from the innerFn has the same effect as
	  // breaking out of the dispatch switch statement.
	  var ContinueSentinel = {};

	  // Dummy constructor functions that we use as the .constructor and
	  // .constructor.prototype properties for functions that return Generator
	  // objects. For full spec compliance, you may wish to configure your
	  // minifier not to mangle the names of these two functions.
	  function Generator() {}
	  function GeneratorFunction() {}
	  function GeneratorFunctionPrototype() {}

	  // This is a polyfill for %IteratorPrototype% for environments that
	  // don't natively support it.
	  var IteratorPrototype = {};
	  IteratorPrototype[iteratorSymbol] = function () {
	    return this;
	  };

	  var getProto = Object.getPrototypeOf;
	  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
	  if (NativeIteratorPrototype &&
	      NativeIteratorPrototype !== Op &&
	      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	    // This environment has a native %IteratorPrototype%; use it instead
	    // of the polyfill.
	    IteratorPrototype = NativeIteratorPrototype;
	  }

	  var Gp = GeneratorFunctionPrototype.prototype =
	    Generator.prototype = Object.create(IteratorPrototype);
	  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
	  GeneratorFunctionPrototype.constructor = GeneratorFunction;
	  GeneratorFunctionPrototype[toStringTagSymbol] =
	    GeneratorFunction.displayName = "GeneratorFunction";

	  // Helper for defining the .next, .throw, and .return methods of the
	  // Iterator interface in terms of a single ._invoke method.
	  function defineIteratorMethods(prototype) {
	    ["next", "throw", "return"].forEach(function(method) {
	      prototype[method] = function(arg) {
	        return this._invoke(method, arg);
	      };
	    });
	  }

	  runtime.isGeneratorFunction = function(genFun) {
	    var ctor = typeof genFun === "function" && genFun.constructor;
	    return ctor
	      ? ctor === GeneratorFunction ||
	        // For the native GeneratorFunction constructor, the best we can
	        // do is to check its .name property.
	        (ctor.displayName || ctor.name) === "GeneratorFunction"
	      : false;
	  };

	  runtime.mark = function(genFun) {
	    if (Object.setPrototypeOf) {
	      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	    } else {
	      genFun.__proto__ = GeneratorFunctionPrototype;
	      if (!(toStringTagSymbol in genFun)) {
	        genFun[toStringTagSymbol] = "GeneratorFunction";
	      }
	    }
	    genFun.prototype = Object.create(Gp);
	    return genFun;
	  };

	  // Within the body of any async function, `await x` is transformed to
	  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	  // `hasOwn.call(value, "__await")` to determine if the yielded value is
	  // meant to be awaited.
	  runtime.awrap = function(arg) {
	    return { __await: arg };
	  };

	  function AsyncIterator(generator) {
	    function invoke(method, arg, resolve, reject) {
	      var record = tryCatch(generator[method], generator, arg);
	      if (record.type === "throw") {
	        reject(record.arg);
	      } else {
	        var result = record.arg;
	        var value = result.value;
	        if (value &&
	            typeof value === "object" &&
	            hasOwn.call(value, "__await")) {
	          return Promise.resolve(value.__await).then(function(value) {
	            invoke("next", value, resolve, reject);
	          }, function(err) {
	            invoke("throw", err, resolve, reject);
	          });
	        }

	        return Promise.resolve(value).then(function(unwrapped) {
	          // When a yielded Promise is resolved, its final value becomes
	          // the .value of the Promise<{value,done}> result for the
	          // current iteration.
	          result.value = unwrapped;
	          resolve(result);
	        }, function(error) {
	          // If a rejected Promise was yielded, throw the rejection back
	          // into the async generator function so it can be handled there.
	          return invoke("throw", error, resolve, reject);
	        });
	      }
	    }

	    var previousPromise;

	    function enqueue(method, arg) {
	      function callInvokeWithMethodAndArg() {
	        return new Promise(function(resolve, reject) {
	          invoke(method, arg, resolve, reject);
	        });
	      }

	      return previousPromise =
	        // If enqueue has been called before, then we want to wait until
	        // all previous Promises have been resolved before calling invoke,
	        // so that results are always delivered in the correct order. If
	        // enqueue has not been called before, then it is important to
	        // call invoke immediately, without waiting on a callback to fire,
	        // so that the async generator function has the opportunity to do
	        // any necessary setup in a predictable way. This predictability
	        // is why the Promise constructor synchronously invokes its
	        // executor callback, and why async functions synchronously
	        // execute code before the first await. Since we implement simple
	        // async functions in terms of async generators, it is especially
	        // important to get this right, even though it requires care.
	        previousPromise ? previousPromise.then(
	          callInvokeWithMethodAndArg,
	          // Avoid propagating failures to Promises returned by later
	          // invocations of the iterator.
	          callInvokeWithMethodAndArg
	        ) : callInvokeWithMethodAndArg();
	    }

	    // Define the unified helper method that is used to implement .next,
	    // .throw, and .return (see defineIteratorMethods).
	    this._invoke = enqueue;
	  }

	  defineIteratorMethods(AsyncIterator.prototype);
	  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
	    return this;
	  };
	  runtime.AsyncIterator = AsyncIterator;

	  // Note that simple async functions are implemented on top of
	  // AsyncIterator objects; they just return a Promise for the value of
	  // the final result produced by the iterator.
	  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
	    var iter = new AsyncIterator(
	      wrap(innerFn, outerFn, self, tryLocsList)
	    );

	    return runtime.isGeneratorFunction(outerFn)
	      ? iter // If outerFn is a generator, return the full iterator.
	      : iter.next().then(function(result) {
	          return result.done ? result.value : iter.next();
	        });
	  };

	  function makeInvokeMethod(innerFn, self, context) {
	    var state = GenStateSuspendedStart;

	    return function invoke(method, arg) {
	      if (state === GenStateExecuting) {
	        throw new Error("Generator is already running");
	      }

	      if (state === GenStateCompleted) {
	        if (method === "throw") {
	          throw arg;
	        }

	        // Be forgiving, per 25.3.3.3.3 of the spec:
	        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
	        return doneResult();
	      }

	      context.method = method;
	      context.arg = arg;

	      while (true) {
	        var delegate = context.delegate;
	        if (delegate) {
	          var delegateResult = maybeInvokeDelegate(delegate, context);
	          if (delegateResult) {
	            if (delegateResult === ContinueSentinel) continue;
	            return delegateResult;
	          }
	        }

	        if (context.method === "next") {
	          // Setting context._sent for legacy support of Babel's
	          // function.sent implementation.
	          context.sent = context._sent = context.arg;

	        } else if (context.method === "throw") {
	          if (state === GenStateSuspendedStart) {
	            state = GenStateCompleted;
	            throw context.arg;
	          }

	          context.dispatchException(context.arg);

	        } else if (context.method === "return") {
	          context.abrupt("return", context.arg);
	        }

	        state = GenStateExecuting;

	        var record = tryCatch(innerFn, self, context);
	        if (record.type === "normal") {
	          // If an exception is thrown from innerFn, we leave state ===
	          // GenStateExecuting and loop back for another invocation.
	          state = context.done
	            ? GenStateCompleted
	            : GenStateSuspendedYield;

	          if (record.arg === ContinueSentinel) {
	            continue;
	          }

	          return {
	            value: record.arg,
	            done: context.done
	          };

	        } else if (record.type === "throw") {
	          state = GenStateCompleted;
	          // Dispatch the exception by looping back around to the
	          // context.dispatchException(context.arg) call above.
	          context.method = "throw";
	          context.arg = record.arg;
	        }
	      }
	    };
	  }

	  // Call delegate.iterator[context.method](context.arg) and handle the
	  // result, either by returning a { value, done } result from the
	  // delegate iterator, or by modifying context.method and context.arg,
	  // setting context.delegate to null, and returning the ContinueSentinel.
	  function maybeInvokeDelegate(delegate, context) {
	    var method = delegate.iterator[context.method];
	    if (method === undefined) {
	      // A .throw or .return when the delegate iterator has no .throw
	      // method always terminates the yield* loop.
	      context.delegate = null;

	      if (context.method === "throw") {
	        if (delegate.iterator.return) {
	          // If the delegate iterator has a return method, give it a
	          // chance to clean up.
	          context.method = "return";
	          context.arg = undefined;
	          maybeInvokeDelegate(delegate, context);

	          if (context.method === "throw") {
	            // If maybeInvokeDelegate(context) changed context.method from
	            // "return" to "throw", let that override the TypeError below.
	            return ContinueSentinel;
	          }
	        }

	        context.method = "throw";
	        context.arg = new TypeError(
	          "The iterator does not provide a 'throw' method");
	      }

	      return ContinueSentinel;
	    }

	    var record = tryCatch(method, delegate.iterator, context.arg);

	    if (record.type === "throw") {
	      context.method = "throw";
	      context.arg = record.arg;
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    var info = record.arg;

	    if (! info) {
	      context.method = "throw";
	      context.arg = new TypeError("iterator result is not an object");
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    if (info.done) {
	      // Assign the result of the finished delegate to the temporary
	      // variable specified by delegate.resultName (see delegateYield).
	      context[delegate.resultName] = info.value;

	      // Resume execution at the desired location (see delegateYield).
	      context.next = delegate.nextLoc;

	      // If context.method was "throw" but the delegate handled the
	      // exception, let the outer generator proceed normally. If
	      // context.method was "next", forget context.arg since it has been
	      // "consumed" by the delegate iterator. If context.method was
	      // "return", allow the original .return call to continue in the
	      // outer generator.
	      if (context.method !== "return") {
	        context.method = "next";
	        context.arg = undefined;
	      }

	    } else {
	      // Re-yield the result returned by the delegate method.
	      return info;
	    }

	    // The delegate iterator is finished, so forget it and continue with
	    // the outer generator.
	    context.delegate = null;
	    return ContinueSentinel;
	  }

	  // Define Generator.prototype.{next,throw,return} in terms of the
	  // unified ._invoke helper method.
	  defineIteratorMethods(Gp);

	  Gp[toStringTagSymbol] = "Generator";

	  // A Generator should always return itself as the iterator object when the
	  // @@iterator function is called on it. Some browsers' implementations of the
	  // iterator prototype chain incorrectly implement this, causing the Generator
	  // object to not be returned from this call. This ensures that doesn't happen.
	  // See https://github.com/facebook/regenerator/issues/274 for more details.
	  Gp[iteratorSymbol] = function() {
	    return this;
	  };

	  Gp.toString = function() {
	    return "[object Generator]";
	  };

	  function pushTryEntry(locs) {
	    var entry = { tryLoc: locs[0] };

	    if (1 in locs) {
	      entry.catchLoc = locs[1];
	    }

	    if (2 in locs) {
	      entry.finallyLoc = locs[2];
	      entry.afterLoc = locs[3];
	    }

	    this.tryEntries.push(entry);
	  }

	  function resetTryEntry(entry) {
	    var record = entry.completion || {};
	    record.type = "normal";
	    delete record.arg;
	    entry.completion = record;
	  }

	  function Context(tryLocsList) {
	    // The root entry object (effectively a try statement without a catch
	    // or a finally block) gives us a place to store values thrown from
	    // locations where there is no enclosing try statement.
	    this.tryEntries = [{ tryLoc: "root" }];
	    tryLocsList.forEach(pushTryEntry, this);
	    this.reset(true);
	  }

	  runtime.keys = function(object) {
	    var keys = [];
	    for (var key in object) {
	      keys.push(key);
	    }
	    keys.reverse();

	    // Rather than returning an object with a next method, we keep
	    // things simple and return the next function itself.
	    return function next() {
	      while (keys.length) {
	        var key = keys.pop();
	        if (key in object) {
	          next.value = key;
	          next.done = false;
	          return next;
	        }
	      }

	      // To avoid creating an additional object, we just hang the .value
	      // and .done properties off the next function object itself. This
	      // also ensures that the minifier will not anonymize the function.
	      next.done = true;
	      return next;
	    };
	  };

	  function values(iterable) {
	    if (iterable) {
	      var iteratorMethod = iterable[iteratorSymbol];
	      if (iteratorMethod) {
	        return iteratorMethod.call(iterable);
	      }

	      if (typeof iterable.next === "function") {
	        return iterable;
	      }

	      if (!isNaN(iterable.length)) {
	        var i = -1, next = function next() {
	          while (++i < iterable.length) {
	            if (hasOwn.call(iterable, i)) {
	              next.value = iterable[i];
	              next.done = false;
	              return next;
	            }
	          }

	          next.value = undefined;
	          next.done = true;

	          return next;
	        };

	        return next.next = next;
	      }
	    }

	    // Return an iterator with no values.
	    return { next: doneResult };
	  }
	  runtime.values = values;

	  function doneResult() {
	    return { value: undefined, done: true };
	  }

	  Context.prototype = {
	    constructor: Context,

	    reset: function(skipTempReset) {
	      this.prev = 0;
	      this.next = 0;
	      // Resetting context._sent for legacy support of Babel's
	      // function.sent implementation.
	      this.sent = this._sent = undefined;
	      this.done = false;
	      this.delegate = null;

	      this.method = "next";
	      this.arg = undefined;

	      this.tryEntries.forEach(resetTryEntry);

	      if (!skipTempReset) {
	        for (var name in this) {
	          // Not sure about the optimal order of these conditions:
	          if (name.charAt(0) === "t" &&
	              hasOwn.call(this, name) &&
	              !isNaN(+name.slice(1))) {
	            this[name] = undefined;
	          }
	        }
	      }
	    },

	    stop: function() {
	      this.done = true;

	      var rootEntry = this.tryEntries[0];
	      var rootRecord = rootEntry.completion;
	      if (rootRecord.type === "throw") {
	        throw rootRecord.arg;
	      }

	      return this.rval;
	    },

	    dispatchException: function(exception) {
	      if (this.done) {
	        throw exception;
	      }

	      var context = this;
	      function handle(loc, caught) {
	        record.type = "throw";
	        record.arg = exception;
	        context.next = loc;

	        if (caught) {
	          // If the dispatched exception was caught by a catch block,
	          // then let that catch block handle the exception normally.
	          context.method = "next";
	          context.arg = undefined;
	        }

	        return !! caught;
	      }

	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        var record = entry.completion;

	        if (entry.tryLoc === "root") {
	          // Exception thrown outside of any try block that could handle
	          // it, so set the completion value of the entire function to
	          // throw the exception.
	          return handle("end");
	        }

	        if (entry.tryLoc <= this.prev) {
	          var hasCatch = hasOwn.call(entry, "catchLoc");
	          var hasFinally = hasOwn.call(entry, "finallyLoc");

	          if (hasCatch && hasFinally) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            } else if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else if (hasCatch) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            }

	          } else if (hasFinally) {
	            if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else {
	            throw new Error("try statement without catch or finally");
	          }
	        }
	      }
	    },

	    abrupt: function(type, arg) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc <= this.prev &&
	            hasOwn.call(entry, "finallyLoc") &&
	            this.prev < entry.finallyLoc) {
	          var finallyEntry = entry;
	          break;
	        }
	      }

	      if (finallyEntry &&
	          (type === "break" ||
	           type === "continue") &&
	          finallyEntry.tryLoc <= arg &&
	          arg <= finallyEntry.finallyLoc) {
	        // Ignore the finally entry if control is not jumping to a
	        // location outside the try/catch block.
	        finallyEntry = null;
	      }

	      var record = finallyEntry ? finallyEntry.completion : {};
	      record.type = type;
	      record.arg = arg;

	      if (finallyEntry) {
	        this.method = "next";
	        this.next = finallyEntry.finallyLoc;
	        return ContinueSentinel;
	      }

	      return this.complete(record);
	    },

	    complete: function(record, afterLoc) {
	      if (record.type === "throw") {
	        throw record.arg;
	      }

	      if (record.type === "break" ||
	          record.type === "continue") {
	        this.next = record.arg;
	      } else if (record.type === "return") {
	        this.rval = this.arg = record.arg;
	        this.method = "return";
	        this.next = "end";
	      } else if (record.type === "normal" && afterLoc) {
	        this.next = afterLoc;
	      }

	      return ContinueSentinel;
	    },

	    finish: function(finallyLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.finallyLoc === finallyLoc) {
	          this.complete(entry.completion, entry.afterLoc);
	          resetTryEntry(entry);
	          return ContinueSentinel;
	        }
	      }
	    },

	    "catch": function(tryLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc === tryLoc) {
	          var record = entry.completion;
	          if (record.type === "throw") {
	            var thrown = record.arg;
	            resetTryEntry(entry);
	          }
	          return thrown;
	        }
	      }

	      // The context.catch method must only be called with a location
	      // argument that corresponds to a known catch block.
	      throw new Error("illegal catch attempt");
	    },

	    delegateYield: function(iterable, resultName, nextLoc) {
	      this.delegate = {
	        iterator: values(iterable),
	        resultName: resultName,
	        nextLoc: nextLoc
	      };

	      if (this.method === "next") {
	        // Deliberately forget the last sent value so that we don't
	        // accidentally pass it on to the delegate.
	        this.arg = undefined;
	      }

	      return ContinueSentinel;
	    }
	  };
	})(
	  // In sloppy mode, unbound `this` refers to the global object, fallback to
	  // Function constructor if we're in global strict mode. That is sadly a form
	  // of indirect eval which violates Content Security Policy.
	  (function() {
	    return this || (typeof self === "object" && self);
	  })() || Function("return this")()
	);
	});

	function _typeof(obj) {
	  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	    _typeof = function (obj) {
	      return typeof obj;
	    };
	  } else {
	    _typeof = function (obj) {
	      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	    };
	  }

	  return _typeof(obj);
	}

	function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
	  try {
	    var info = gen[key](arg);
	    var value = info.value;
	  } catch (error) {
	    reject(error);
	    return;
	  }

	  if (info.done) {
	    resolve(value);
	  } else {
	    Promise.resolve(value).then(_next, _throw);
	  }
	}

	function _asyncToGenerator(fn) {
	  return function () {
	    var self = this,
	        args = arguments;
	    return new Promise(function (resolve, reject) {
	      var gen = fn.apply(self, args);

	      function _next(value) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
	      }

	      function _throw(err) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
	      }

	      _next(undefined);
	    });
	  };
	}

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	function _defineProperties(target, props) {
	  for (var i = 0; i < props.length; i++) {
	    var descriptor = props[i];
	    descriptor.enumerable = descriptor.enumerable || false;
	    descriptor.configurable = true;
	    if ("value" in descriptor) descriptor.writable = true;
	    Object.defineProperty(target, descriptor.key, descriptor);
	  }
	}

	function _createClass(Constructor, protoProps, staticProps) {
	  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
	  if (staticProps) _defineProperties(Constructor, staticProps);
	  return Constructor;
	}

	function _inherits(subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function");
	  }

	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) _setPrototypeOf(subClass, superClass);
	}

	function _getPrototypeOf(o) {
	  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
	    return o.__proto__ || Object.getPrototypeOf(o);
	  };
	  return _getPrototypeOf(o);
	}

	function _setPrototypeOf(o, p) {
	  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
	    o.__proto__ = p;
	    return o;
	  };

	  return _setPrototypeOf(o, p);
	}

	function isNativeReflectConstruct() {
	  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
	  if (Reflect.construct.sham) return false;
	  if (typeof Proxy === "function") return true;

	  try {
	    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
	    return true;
	  } catch (e) {
	    return false;
	  }
	}

	function _construct(Parent, args, Class) {
	  if (isNativeReflectConstruct()) {
	    _construct = Reflect.construct;
	  } else {
	    _construct = function _construct(Parent, args, Class) {
	      var a = [null];
	      a.push.apply(a, args);
	      var Constructor = Function.bind.apply(Parent, a);
	      var instance = new Constructor();
	      if (Class) _setPrototypeOf(instance, Class.prototype);
	      return instance;
	    };
	  }

	  return _construct.apply(null, arguments);
	}

	function _isNativeFunction(fn) {
	  return Function.toString.call(fn).indexOf("[native code]") !== -1;
	}

	function _wrapNativeSuper(Class) {
	  var _cache = typeof Map === "function" ? new Map() : undefined;

	  _wrapNativeSuper = function _wrapNativeSuper(Class) {
	    if (Class === null || !_isNativeFunction(Class)) return Class;

	    if (typeof Class !== "function") {
	      throw new TypeError("Super expression must either be null or a function");
	    }

	    if (typeof _cache !== "undefined") {
	      if (_cache.has(Class)) return _cache.get(Class);

	      _cache.set(Class, Wrapper);
	    }

	    function Wrapper() {
	      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
	    }

	    Wrapper.prototype = Object.create(Class.prototype, {
	      constructor: {
	        value: Wrapper,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	    return _setPrototypeOf(Wrapper, Class);
	  };

	  return _wrapNativeSuper(Class);
	}

	function _assertThisInitialized(self) {
	  if (self === void 0) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return self;
	}

	function _possibleConstructorReturn(self, call) {
	  if (call && (typeof call === "object" || typeof call === "function")) {
	    return call;
	  }

	  return _assertThisInitialized(self);
	}

	function _slicedToArray(arr, i) {
	  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
	}

	function _toArray(arr) {
	  return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest();
	}

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	function _iterableToArray(iter) {
	  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
	}

	function _iterableToArrayLimit(arr, i) {
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance");
	}

	var load = function load(received, defaults) {
	  var onto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	  var k, ref, v;

	  for (k in defaults) {
	    v = defaults[k];
	    onto[k] = (ref = received[k]) != null ? ref : v;
	  }

	  return onto;
	};

	var overwrite = function overwrite(received, defaults) {
	  var onto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	  var k, v;

	  for (k in received) {
	    v = received[k];

	    if (defaults[k] !== void 0) {
	      onto[k] = v;
	    }
	  }

	  return onto;
	};

	var parser = {
	  load: load,
	  overwrite: overwrite
	};

	var DLList;

	DLList =
	/*#__PURE__*/
	function () {
	  function DLList(_queues) {
	    _classCallCheck(this, DLList);

	    this._queues = _queues;
	    this._first = null;
	    this._last = null;
	    this.length = 0;
	  }

	  _createClass(DLList, [{
	    key: "push",
	    value: function push(value) {
	      var node, ref1;
	      this.length++;

	      if ((ref1 = this._queues) != null) {
	        ref1.incr();
	      }

	      node = {
	        value: value,
	        next: null
	      };

	      if (this._last != null) {
	        this._last.next = node;
	        this._last = node;
	      } else {
	        this._first = this._last = node;
	      }

	      return void 0;
	    }
	  }, {
	    key: "shift",
	    value: function shift() {
	      var ref1, ref2, value;

	      if (this._first == null) {
	        return void 0;
	      } else {
	        this.length--;

	        if ((ref1 = this._queues) != null) {
	          ref1.decr();
	        }
	      }

	      value = this._first.value;
	      this._first = (ref2 = this._first.next) != null ? ref2 : this._last = null;
	      return value;
	    }
	  }, {
	    key: "first",
	    value: function first() {
	      if (this._first != null) {
	        return this._first.value;
	      }
	    }
	  }, {
	    key: "getArray",
	    value: function getArray() {
	      var node, ref, results;
	      node = this._first;
	      results = [];

	      while (node != null) {
	        results.push((ref = node, node = node.next, ref.value));
	      }

	      return results;
	    }
	  }, {
	    key: "forEachShift",
	    value: function forEachShift(cb) {
	      var node;
	      node = this.shift();

	      while (node != null) {
	        cb(node), node = this.shift();
	      }

	      return void 0;
	    }
	  }]);

	  return DLList;
	}();

	var DLList_1 = DLList;

	var Events;

	Events =
	/*#__PURE__*/
	function () {
	  function Events(instance) {
	    var _this = this;

	    _classCallCheck(this, Events);

	    this.instance = instance;
	    this._events = {};

	    this.instance.on = function (name, cb) {
	      return _this._addListener(name, "many", cb);
	    };

	    this.instance.once = function (name, cb) {
	      return _this._addListener(name, "once", cb);
	    };

	    this.instance.removeAllListeners = function () {
	      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

	      if (name != null) {
	        return delete _this._events[name];
	      } else {
	        return _this._events = {};
	      }
	    };
	  }

	  _createClass(Events, [{
	    key: "_addListener",
	    value: function _addListener(name, status, cb) {
	      var base;

	      if ((base = this._events)[name] == null) {
	        base[name] = [];
	      }

	      this._events[name].push({
	        cb: cb,
	        status: status
	      });

	      return this.instance;
	    }
	  }, {
	    key: "trigger",
	    value: function trigger(name, args) {
	      var _this2 = this;

	      if (name !== "debug") {
	        this.trigger("debug", ["Event triggered: ".concat(name), args]);
	      }

	      if (this._events[name] == null) {
	        return;
	      }

	      this._events[name] = this._events[name].filter(function (listener) {
	        return listener.status !== "none";
	      });
	      return this._events[name].forEach(function (listener) {
	        var e, ret;

	        if (listener.status === "none") {
	          return;
	        }

	        if (listener.status === "once") {
	          listener.status = "none";
	        }

	        try {
	          ret = listener.cb.apply({}, args);

	          if (typeof (ret != null ? ret.then : void 0) === "function") {
	            return ret.then(function () {}).catch(function (e) {
	              return _this2.trigger("error", [e]);
	            });
	          }
	        } catch (error) {
	          e = error;

	          {
	            return _this2.trigger("error", [e]);
	          }
	        }
	      });
	    }
	  }]);

	  return Events;
	}();

	var Events_1 = Events;

	var DLList$1, Events$1, Queues;
	DLList$1 = DLList_1;
	Events$1 = Events_1;

	Queues =
	/*#__PURE__*/
	function () {
	  function Queues(num_priorities) {
	    _classCallCheck(this, Queues);

	    var i;
	    this.Events = new Events$1(this);
	    this._length = 0;

	    this._lists = function () {
	      var j, ref, results;
	      results = [];

	      for (i = j = 1, ref = num_priorities; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
	        results.push(new DLList$1(this));
	      }

	      return results;
	    }.call(this);
	  }

	  _createClass(Queues, [{
	    key: "incr",
	    value: function incr() {
	      if (this._length++ === 0) {
	        return this.Events.trigger("leftzero");
	      }
	    }
	  }, {
	    key: "decr",
	    value: function decr() {
	      if (--this._length === 0) {
	        return this.Events.trigger("zero");
	      }
	    }
	  }, {
	    key: "push",
	    value: function push(priority, job) {
	      return this._lists[priority].push(job);
	    }
	  }, {
	    key: "queued",
	    value: function queued(priority) {
	      if (priority != null) {
	        return this._lists[priority].length;
	      } else {
	        return this._length;
	      }
	    }
	  }, {
	    key: "shiftAll",
	    value: function shiftAll(fn) {
	      return this._lists.forEach(function (list) {
	        return list.forEachShift(fn);
	      });
	    }
	  }, {
	    key: "getFirst",
	    value: function getFirst() {
	      var arr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this._lists;
	      var j, len, list;

	      for (j = 0, len = arr.length; j < len; j++) {
	        list = arr[j];

	        if (list.length > 0) {
	          return list;
	        }
	      }

	      return [];
	    }
	  }, {
	    key: "shiftLastFrom",
	    value: function shiftLastFrom(priority) {
	      return this.getFirst(this._lists.slice(priority).reverse()).shift();
	    }
	  }]);

	  return Queues;
	}();

	var Queues_1 = Queues;

	var BottleneckError;

	BottleneckError =
	/*#__PURE__*/
	function (_Error) {
	  _inherits(BottleneckError, _Error);

	  function BottleneckError() {
	    _classCallCheck(this, BottleneckError);

	    return _possibleConstructorReturn(this, _getPrototypeOf(BottleneckError).apply(this, arguments));
	  }

	  return BottleneckError;
	}(_wrapNativeSuper(Error));

	var BottleneckError_1 = BottleneckError;

	var BottleneckError$1, LocalDatastore, parser$1;
	parser$1 = parser;
	BottleneckError$1 = BottleneckError_1;

	LocalDatastore =
	/*#__PURE__*/
	function () {
	  function LocalDatastore(instance, storeOptions, storeInstanceOptions) {
	    var _this = this;

	    _classCallCheck(this, LocalDatastore);

	    var base;
	    this.instance = instance;
	    this.storeOptions = storeOptions;
	    parser$1.load(storeInstanceOptions, storeInstanceOptions, this);
	    this._nextRequest = this._lastReservoirRefresh = Date.now();
	    this._running = 0;
	    this._done = 0;
	    this._unblockTime = 0;
	    this.ready = this.yieldLoop();
	    this.clients = {};

	    if (typeof (base = this.heartbeat = setInterval(function () {
	      var now, reservoirRefreshActive;
	      now = Date.now();
	      reservoirRefreshActive = _this.storeOptions.reservoirRefreshInterval != null && _this.storeOptions.reservoirRefreshAmount != null;

	      if (reservoirRefreshActive && now >= _this._lastReservoirRefresh + _this.storeOptions.reservoirRefreshInterval) {
	        _this.storeOptions.reservoir = _this.storeOptions.reservoirRefreshAmount;
	        _this._lastReservoirRefresh = now;
	        return _this.instance._drainAll(_this.computeCapacity());
	      }
	    }, this.heartbeatInterval)).unref === "function") {
	      base.unref();
	    }
	  }

	  _createClass(LocalDatastore, [{
	    key: "__publish__",
	    value: function () {
	      var _publish__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee(message) {
	        return regeneratorRuntime.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                _context.next = 2;
	                return this.yieldLoop();

	              case 2:
	                return _context.abrupt("return", this.instance.Events.trigger("message", [message.toString()]));

	              case 3:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee, this);
	      }));

	      return function __publish__(_x) {
	        return _publish__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__disconnect__",
	    value: function __disconnect__(flush) {
	      clearInterval(this.heartbeat);
	      return this.Promise.resolve();
	    }
	  }, {
	    key: "yieldLoop",
	    value: function yieldLoop() {
	      var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
	      return new this.Promise(function (resolve, reject) {
	        return setTimeout(resolve, t);
	      });
	    }
	  }, {
	    key: "computePenalty",
	    value: function computePenalty() {
	      var ref;
	      return (ref = this.storeOptions.penalty) != null ? ref : 15 * this.storeOptions.minTime || 5000;
	    }
	  }, {
	    key: "__updateSettings__",
	    value: function () {
	      var _updateSettings__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee2(options) {
	        return regeneratorRuntime.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                _context2.next = 2;
	                return this.yieldLoop();

	              case 2:
	                parser$1.overwrite(options, options, this.storeOptions);

	                this.instance._drainAll(this.computeCapacity());

	                return _context2.abrupt("return", true);

	              case 5:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2, this);
	      }));

	      return function __updateSettings__(_x2) {
	        return _updateSettings__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__running__",
	    value: function () {
	      var _running__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee3() {
	        return regeneratorRuntime.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                _context3.next = 2;
	                return this.yieldLoop();

	              case 2:
	                return _context3.abrupt("return", this._running);

	              case 3:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3, this);
	      }));

	      return function __running__() {
	        return _running__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__done__",
	    value: function () {
	      var _done__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee4() {
	        return regeneratorRuntime.wrap(function _callee4$(_context4) {
	          while (1) {
	            switch (_context4.prev = _context4.next) {
	              case 0:
	                _context4.next = 2;
	                return this.yieldLoop();

	              case 2:
	                return _context4.abrupt("return", this._done);

	              case 3:
	              case "end":
	                return _context4.stop();
	            }
	          }
	        }, _callee4, this);
	      }));

	      return function __done__() {
	        return _done__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__groupCheck__",
	    value: function () {
	      var _groupCheck__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee5(time) {
	        return regeneratorRuntime.wrap(function _callee5$(_context5) {
	          while (1) {
	            switch (_context5.prev = _context5.next) {
	              case 0:
	                _context5.next = 2;
	                return this.yieldLoop();

	              case 2:
	                return _context5.abrupt("return", this._nextRequest + this.timeout < time);

	              case 3:
	              case "end":
	                return _context5.stop();
	            }
	          }
	        }, _callee5, this);
	      }));

	      return function __groupCheck__(_x3) {
	        return _groupCheck__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "computeCapacity",
	    value: function computeCapacity() {
	      var maxConcurrent, reservoir;
	      var _this$storeOptions = this.storeOptions;
	      maxConcurrent = _this$storeOptions.maxConcurrent;
	      reservoir = _this$storeOptions.reservoir;

	      if (maxConcurrent != null && reservoir != null) {
	        return Math.min(maxConcurrent - this._running, reservoir);
	      } else if (maxConcurrent != null) {
	        return maxConcurrent - this._running;
	      } else if (reservoir != null) {
	        return reservoir;
	      } else {
	        return null;
	      }
	    }
	  }, {
	    key: "conditionsCheck",
	    value: function conditionsCheck(weight) {
	      var capacity;
	      capacity = this.computeCapacity();
	      return capacity == null || weight <= capacity;
	    }
	  }, {
	    key: "__incrementReservoir__",
	    value: function () {
	      var _incrementReservoir__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee6(incr) {
	        var reservoir;
	        return regeneratorRuntime.wrap(function _callee6$(_context6) {
	          while (1) {
	            switch (_context6.prev = _context6.next) {
	              case 0:
	                _context6.next = 2;
	                return this.yieldLoop();

	              case 2:
	                reservoir = this.storeOptions.reservoir += incr;

	                this.instance._drainAll(this.computeCapacity());

	                return _context6.abrupt("return", reservoir);

	              case 5:
	              case "end":
	                return _context6.stop();
	            }
	          }
	        }, _callee6, this);
	      }));

	      return function __incrementReservoir__(_x4) {
	        return _incrementReservoir__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__currentReservoir__",
	    value: function () {
	      var _currentReservoir__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee7() {
	        return regeneratorRuntime.wrap(function _callee7$(_context7) {
	          while (1) {
	            switch (_context7.prev = _context7.next) {
	              case 0:
	                _context7.next = 2;
	                return this.yieldLoop();

	              case 2:
	                return _context7.abrupt("return", this.storeOptions.reservoir);

	              case 3:
	              case "end":
	                return _context7.stop();
	            }
	          }
	        }, _callee7, this);
	      }));

	      return function __currentReservoir__() {
	        return _currentReservoir__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "isBlocked",
	    value: function isBlocked(now) {
	      return this._unblockTime >= now;
	    }
	  }, {
	    key: "check",
	    value: function check(weight, now) {
	      return this.conditionsCheck(weight) && this._nextRequest - now <= 0;
	    }
	  }, {
	    key: "__check__",
	    value: function () {
	      var _check__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee8(weight) {
	        var now;
	        return regeneratorRuntime.wrap(function _callee8$(_context8) {
	          while (1) {
	            switch (_context8.prev = _context8.next) {
	              case 0:
	                _context8.next = 2;
	                return this.yieldLoop();

	              case 2:
	                now = Date.now();
	                return _context8.abrupt("return", this.check(weight, now));

	              case 4:
	              case "end":
	                return _context8.stop();
	            }
	          }
	        }, _callee8, this);
	      }));

	      return function __check__(_x5) {
	        return _check__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__register__",
	    value: function () {
	      var _register__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee9(index, weight, expiration) {
	        var now, wait;
	        return regeneratorRuntime.wrap(function _callee9$(_context9) {
	          while (1) {
	            switch (_context9.prev = _context9.next) {
	              case 0:
	                _context9.next = 2;
	                return this.yieldLoop();

	              case 2:
	                now = Date.now();

	                if (!this.conditionsCheck(weight)) {
	                  _context9.next = 11;
	                  break;
	                }

	                this._running += weight;

	                if (this.storeOptions.reservoir != null) {
	                  this.storeOptions.reservoir -= weight;
	                }

	                wait = Math.max(this._nextRequest - now, 0);
	                this._nextRequest = now + wait + this.storeOptions.minTime;
	                return _context9.abrupt("return", {
	                  success: true,
	                  wait: wait,
	                  reservoir: this.storeOptions.reservoir
	                });

	              case 11:
	                return _context9.abrupt("return", {
	                  success: false
	                });

	              case 12:
	              case "end":
	                return _context9.stop();
	            }
	          }
	        }, _callee9, this);
	      }));

	      return function __register__(_x6, _x7, _x8) {
	        return _register__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "strategyIsBlock",
	    value: function strategyIsBlock() {
	      return this.storeOptions.strategy === 3;
	    }
	  }, {
	    key: "__submit__",
	    value: function () {
	      var _submit__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee10(queueLength, weight) {
	        var blocked, now, reachedHWM;
	        return regeneratorRuntime.wrap(function _callee10$(_context10) {
	          while (1) {
	            switch (_context10.prev = _context10.next) {
	              case 0:
	                _context10.next = 2;
	                return this.yieldLoop();

	              case 2:
	                if (!(this.storeOptions.maxConcurrent != null && weight > this.storeOptions.maxConcurrent)) {
	                  _context10.next = 4;
	                  break;
	                }

	                throw new BottleneckError$1("Impossible to add a job having a weight of ".concat(weight, " to a limiter having a maxConcurrent setting of ").concat(this.storeOptions.maxConcurrent));

	              case 4:
	                now = Date.now();
	                reachedHWM = this.storeOptions.highWater != null && queueLength === this.storeOptions.highWater && !this.check(weight, now);
	                blocked = this.strategyIsBlock() && (reachedHWM || this.isBlocked(now));

	                if (blocked) {
	                  this._unblockTime = now + this.computePenalty();
	                  this._nextRequest = this._unblockTime + this.storeOptions.minTime;

	                  this.instance._dropAllQueued();
	                }

	                return _context10.abrupt("return", {
	                  reachedHWM: reachedHWM,
	                  blocked: blocked,
	                  strategy: this.storeOptions.strategy
	                });

	              case 9:
	              case "end":
	                return _context10.stop();
	            }
	          }
	        }, _callee10, this);
	      }));

	      return function __submit__(_x9, _x10) {
	        return _submit__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__free__",
	    value: function () {
	      var _free__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee11(index, weight) {
	        return regeneratorRuntime.wrap(function _callee11$(_context11) {
	          while (1) {
	            switch (_context11.prev = _context11.next) {
	              case 0:
	                _context11.next = 2;
	                return this.yieldLoop();

	              case 2:
	                this._running -= weight;
	                this._done += weight;

	                this.instance._drainAll(this.computeCapacity());

	                return _context11.abrupt("return", {
	                  running: this._running
	                });

	              case 6:
	              case "end":
	                return _context11.stop();
	            }
	          }
	        }, _callee11, this);
	      }));

	      return function __free__(_x11, _x12) {
	        return _free__.apply(this, arguments);
	      };
	    }()
	  }]);

	  return LocalDatastore;
	}();

	var LocalDatastore_1 = LocalDatastore;

	var lua = {
		"check.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal weight = tonumber(ARGV[2])\n\nlocal capacity = refresh_capacity(executing_key, running_key, settings_key, now, false)[1]\nlocal nextRequest = tonumber(redis.call('hget', settings_key, 'nextRequest'))\n\nreturn conditions_check(capacity, weight) and nextRequest - now <= 0\n",
		"conditions_check.lua": "local conditions_check = function (capacity, weight)\n  return capacity == nil or weight <= capacity\nend\n",
		"current_reservoir.lua": "local settings_key = KEYS[1]\n\nlocal now = tonumber(ARGV[1])\n\nreturn tonumber(redis.call('hget', settings_key, 'reservoir'))\n",
		"done.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\n\nrefresh_capacity(executing_key, running_key, settings_key, now, false)\n\nreturn tonumber(redis.call('hget', settings_key, 'done'))\n",
		"free.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal index = ARGV[2]\n\nredis.call('zadd', executing_key, 0, index)\n\nreturn refresh_capacity(executing_key, running_key, settings_key, now, false)[2]\n",
		"get_time.lua": "redis.replicate_commands()\n\nlocal get_time = function ()\n  local time = redis.call('time')\n\n  return tonumber(time[1]..string.sub(time[2], 1, 3))\nend\n",
		"group_check.lua": "local settings_key = KEYS[1]\n\nlocal now = tonumber(ARGV[1])\n\nreturn not (redis.call('exists', settings_key) == 1)\n",
		"heartbeat.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\n\nrefresh_capacity(executing_key, running_key, settings_key, now, false)\n",
		"increment_reservoir.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal incr = tonumber(ARGV[2])\n\nredis.call('hincrby', settings_key, 'reservoir', incr)\n\nlocal reservoir = refresh_capacity(executing_key, running_key, settings_key, now, true)[3]\n\nlocal groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))\nrefresh_expiration(executing_key, running_key, settings_key, 0, 0, groupTimeout)\n\nreturn reservoir\n",
		"init.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal clear = tonumber(ARGV[2])\nlocal limiter_version = ARGV[3]\n\nif clear == 1 then\n  redis.call('del', settings_key, running_key, executing_key)\nend\n\nif redis.call('exists', settings_key) == 0 then\n  -- Create\n  local args = {'hmset', settings_key}\n\n  for i = 4, #ARGV do\n    table.insert(args, ARGV[i])\n  end\n\n  redis.call(unpack(args))\n  redis.call('hmset', settings_key,\n    'nextRequest', now,\n    'lastReservoirRefresh', now,\n    'running', 0,\n    'done', 0,\n    'unblockTime', 0\n  )\n\nelse\n  -- Apply migrations\n  local current_version = redis.call('hget', settings_key, 'version')\n  if current_version ~= limiter_version then\n    local version_digits = {}\n    for k, v in string.gmatch(current_version, \"([^.]+)\") do\n      table.insert(version_digits, tonumber(k))\n    end\n\n    -- 2.10.0\n    if version_digits[2] < 10 then\n      redis.call('hsetnx', settings_key, 'reservoirRefreshInterval', '')\n      redis.call('hsetnx', settings_key, 'reservoirRefreshAmount', '')\n      redis.call('hsetnx', settings_key, 'lastReservoirRefresh', '')\n      redis.call('hsetnx', settings_key, 'done', 0)\n      redis.call('hset', settings_key, 'version', '2.10.0')\n    end\n\n    -- 2.11.1\n    if version_digits[2] < 11 and version_digits[3] < 1 then\n      if redis.call('hstrlen', settings_key, 'lastReservoirRefresh') == 0 then\n        redis.call('hmset', settings_key,\n          'lastReservoirRefresh', now,\n          'version', '2.11.1'\n        )\n      end\n    end\n  end\n\n  refresh_capacity(executing_key, running_key, settings_key, now, false)\nend\n\nlocal groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))\nrefresh_expiration(executing_key, running_key, settings_key, 0, 0, groupTimeout)\n\nreturn {}\n",
		"refresh_capacity.lua": "local refresh_capacity = function (executing_key, running_key, settings_key, now, always_publish)\n\n  local compute_capacity = function (maxConcurrent, running, reservoir)\n    if maxConcurrent ~= nil and reservoir ~= nil then\n      return math.min((maxConcurrent - running), reservoir)\n    elseif maxConcurrent ~= nil then\n      return maxConcurrent - running\n    elseif reservoir ~= nil then\n      return reservoir\n    else\n      return nil\n    end\n  end\n\n  local settings = redis.call('hmget', settings_key,\n    'id',\n    'maxConcurrent',\n    'running',\n    'reservoir',\n    'reservoirRefreshInterval',\n    'reservoirRefreshAmount',\n    'lastReservoirRefresh'\n  )\n  local id = settings[1]\n  local maxConcurrent = tonumber(settings[2])\n  local running = tonumber(settings[3])\n  local reservoir = tonumber(settings[4])\n  local reservoirRefreshInterval = tonumber(settings[5])\n  local reservoirRefreshAmount = tonumber(settings[6])\n  local lastReservoirRefresh = tonumber(settings[7])\n\n  local initial_capacity = compute_capacity(maxConcurrent, running, reservoir)\n\n  --\n  -- Compute 'running' changes\n  --\n  local expired = redis.call('zrangebyscore', executing_key, '-inf', '('..now)\n\n  if #expired > 0 then\n    redis.call('zremrangebyscore', executing_key, '-inf', '('..now)\n\n    local make_batch = function ()\n      return {'hmget', running_key}\n    end\n\n    local flush_batch = function (batch)\n      local weights = redis.call(unpack(batch))\n      batch[1] = 'hdel'\n      local deleted = redis.call(unpack(batch))\n\n      local sum = 0\n      for i = 1, #weights do\n        sum = sum + (tonumber(weights[i]) or 0)\n      end\n      return sum\n    end\n\n    local total = 0\n    local batch_size = 1000\n\n    for i = 1, #expired, batch_size do\n      local batch = make_batch()\n      for j = i, math.min(i + batch_size - 1, #expired) do\n        table.insert(batch, expired[j])\n      end\n      total = total + flush_batch(batch)\n    end\n\n    if total > 0 then\n      redis.call('hincrby', settings_key, 'done', total)\n      running = tonumber(redis.call('hincrby', settings_key, 'running', -total))\n    end\n  end\n\n  --\n  -- Compute 'reservoir' changes\n  --\n  local reservoirRefreshActive = reservoirRefreshInterval ~= nil and reservoirRefreshAmount ~= nil\n  if reservoirRefreshActive and now >= lastReservoirRefresh + reservoirRefreshInterval then\n    reservoir = reservoirRefreshAmount\n    redis.call('hmset', settings_key,\n      'reservoir', reservoir,\n      'lastReservoirRefresh', now\n    )\n  end\n\n  --\n  -- Broadcast capacity changes\n  --\n  local final_capacity = compute_capacity(maxConcurrent, running, reservoir)\n\n  if always_publish or (\n    -- was not unlimited, now unlimited\n    initial_capacity ~= nil and final_capacity == nil\n  ) or (\n    -- capacity was increased\n    initial_capacity ~= nil and final_capacity ~= nil and final_capacity > initial_capacity\n  ) then\n    redis.call('publish', 'b_'..id, 'capacity:'..final_capacity)\n  end\n\n  return {final_capacity, running, reservoir}\nend\n",
		"refresh_expiration.lua": "local refresh_expiration = function (executing_key, running_key, settings_key, now, nextRequest, groupTimeout)\n\n  if groupTimeout ~= nil then\n    local ttl = (nextRequest + groupTimeout) - now\n\n    redis.call('pexpire', executing_key, ttl)\n    redis.call('pexpire', running_key, ttl)\n    redis.call('pexpire', settings_key, ttl)\n  end\n\nend\n",
		"register.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal index = ARGV[2]\nlocal weight = tonumber(ARGV[3])\nlocal expiration = tonumber(ARGV[4])\n\nlocal state = refresh_capacity(executing_key, running_key, settings_key, now, false)\nlocal capacity = state[1]\nlocal reservoir = state[3]\n\nlocal settings = redis.call('hmget', settings_key,\n  'nextRequest',\n  'minTime',\n  'groupTimeout'\n)\nlocal nextRequest = tonumber(settings[1])\nlocal minTime = tonumber(settings[2])\nlocal groupTimeout = tonumber(settings[3])\n\nif conditions_check(capacity, weight) then\n\n  if expiration ~= nil then\n    redis.call('zadd', executing_key, now + expiration, index)\n  end\n  redis.call('hset', running_key, index, weight)\n  redis.call('hincrby', settings_key, 'running', weight)\n\n  local wait = math.max(nextRequest - now, 0)\n  local newNextRequest = now + wait + minTime\n\n  if reservoir == nil then\n    redis.call('hset', settings_key,\n    'nextRequest', newNextRequest\n    )\n  else\n    reservoir = reservoir - weight\n    redis.call('hmset', settings_key,\n      'reservoir', reservoir,\n      'nextRequest', newNextRequest\n    )\n  end\n\n  refresh_expiration(executing_key, running_key, settings_key, now, newNextRequest, groupTimeout)\n\n  return {true, wait, reservoir}\n\nelse\n  return {false}\nend\n",
		"running.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\n\nreturn refresh_capacity(executing_key, running_key, settings_key, now, false)[2]\n",
		"submit.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\nlocal queueLength = tonumber(ARGV[2])\nlocal weight = tonumber(ARGV[3])\n\nlocal capacity = refresh_capacity(executing_key, running_key, settings_key, now, false)[1]\n\nlocal settings = redis.call('hmget', settings_key,\n  'id',\n  'maxConcurrent',\n  'highWater',\n  'nextRequest',\n  'strategy',\n  'unblockTime',\n  'penalty',\n  'minTime',\n  'groupTimeout'\n)\nlocal id = settings[1]\nlocal maxConcurrent = tonumber(settings[2])\nlocal highWater = tonumber(settings[3])\nlocal nextRequest = tonumber(settings[4])\nlocal strategy = tonumber(settings[5])\nlocal unblockTime = tonumber(settings[6])\nlocal penalty = tonumber(settings[7])\nlocal minTime = tonumber(settings[8])\nlocal groupTimeout = tonumber(settings[9])\n\nif maxConcurrent ~= nil and weight > maxConcurrent then\n  return redis.error_reply('OVERWEIGHT:'..weight..':'..maxConcurrent)\nend\n\nlocal reachedHWM = (highWater ~= nil and queueLength == highWater\n  and not (\n    conditions_check(capacity, weight)\n    and nextRequest - now <= 0\n  )\n)\n\nlocal blocked = strategy == 3 and (reachedHWM or unblockTime >= now)\n\nif blocked then\n  local computedPenalty = penalty\n  if computedPenalty == nil then\n    if minTime == 0 then\n      computedPenalty = 5000\n    else\n      computedPenalty = 15 * minTime\n    end\n  end\n\n  local newNextRequest = now + computedPenalty + minTime\n\n  redis.call('hmset', settings_key,\n    'unblockTime', now + computedPenalty,\n    'nextRequest', newNextRequest\n  )\n\n  redis.call('publish', 'b_'..id, 'blocked:')\n\n  refresh_expiration(executing_key, running_key, settings_key, now, newNextRequest, groupTimeout)\nend\n\nreturn {reachedHWM, blocked, strategy}\n",
		"update_settings.lua": "local settings_key = KEYS[1]\nlocal running_key = KEYS[2]\nlocal executing_key = KEYS[3]\n\nlocal now = tonumber(ARGV[1])\n\nlocal args = {'hmset', settings_key}\n\nfor i = 2, #ARGV do\n  table.insert(args, ARGV[i])\nend\n\nredis.call(unpack(args))\n\nrefresh_capacity(executing_key, running_key, settings_key, now, true)\n\nlocal groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))\nrefresh_expiration(executing_key, running_key, settings_key, 0, 0, groupTimeout)\n\nreturn {}\n",
		"validate_keys.lua": "local settings_key = KEYS[1]\n\nif not (redis.call('exists', settings_key) == 1) then\n  return redis.error_reply('SETTINGS_KEY_NOT_FOUND')\nend\n"
	};

	var lua$1 = /*#__PURE__*/Object.freeze({
		default: lua
	});

	var require$$0 = getCjsExportFromNamespace(lua$1);

	var libraries, lua$2, templates;
	lua$2 = require$$0;
	libraries = {
	  get_time: lua$2["get_time.lua"],
	  refresh_capacity: lua$2["refresh_capacity.lua"],
	  conditions_check: lua$2["conditions_check.lua"],
	  refresh_expiration: lua$2["refresh_expiration.lua"],
	  validate_keys: lua$2["validate_keys.lua"]
	};
	templates = {
	  init: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["refresh_capacity", "refresh_expiration"],
	    code: lua$2["init.lua"]
	  },
	  heartbeat: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity"],
	    code: lua$2["heartbeat.lua"]
	  },
	  update_settings: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity", "refresh_expiration"],
	    code: lua$2["update_settings.lua"]
	  },
	  running: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity"],
	    code: lua$2["running.lua"]
	  },
	  done: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity"],
	    code: lua$2["done.lua"]
	  },
	  group_check: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings")];
	    },
	    libs: [],
	    code: lua$2["group_check.lua"]
	  },
	  check: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity", "conditions_check"],
	    code: lua$2["check.lua"]
	  },
	  submit: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity", "conditions_check", "refresh_expiration"],
	    code: lua$2["submit.lua"]
	  },
	  register: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity", "conditions_check", "refresh_expiration"],
	    code: lua$2["register.lua"]
	  },
	  free: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity"],
	    code: lua$2["free.lua"]
	  },
	  current_reservoir: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings")];
	    },
	    libs: ["validate_keys"],
	    code: lua$2["current_reservoir.lua"]
	  },
	  increment_reservoir: {
	    keys: function keys(id) {
	      return ["b_".concat(id, "_settings"), "b_".concat(id, "_running"), "b_".concat(id, "_executing")];
	    },
	    libs: ["validate_keys", "refresh_capacity", "refresh_expiration"],
	    code: lua$2["increment_reservoir.lua"]
	  }
	};
	var names = Object.keys(templates);

	var keys = function keys(name, id) {
	  return templates[name].keys(id);
	};

	var payload = function payload(name) {
	  return templates[name].libs.map(function (lib) {
	    return libraries[lib];
	  }).join("\n") + templates[name].code;
	};

	var Scripts = {
	  names: names,
	  keys: keys,
	  payload: payload
	};

	var Events$2, RedisConnection, Scripts$1, parser$2;
	parser$2 = parser;
	Events$2 = Events_1;
	Scripts$1 = Scripts;

	RedisConnection = function () {
	  var RedisConnection =
	  /*#__PURE__*/
	  function () {
	    function RedisConnection() {
	      var _this = this;

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      _classCallCheck(this, RedisConnection);

	      var Redis;
	      Redis = eval("require")("redis"); // Obfuscated or else Webpack/Angular will try to inline the optional redis module

	      parser$2.load(options, this.defaults, this);

	      if (this.Events == null) {
	        this.Events = new Events$2(this);
	      }

	      this.terminated = false;

	      if (this.client == null) {
	        this.client = Redis.createClient(this.clientOptions);
	      }

	      this.subscriber = this.client.duplicate();
	      this.limiters = {};
	      this.shas = {};
	      this.ready = this.Promise.all([this._setup(this.client, false), this._setup(this.subscriber, true)]).then(function () {
	        return _this._loadScripts();
	      }).then(function () {
	        return {
	          client: _this.client,
	          subscriber: _this.subscriber
	        };
	      });
	    }

	    _createClass(RedisConnection, [{
	      key: "_setup",
	      value: function _setup(client, subscriber) {
	        var _this2 = this;

	        return new this.Promise(function (resolve, reject) {
	          client.on("error", function (e) {
	            return _this2.Events.trigger("error", [e]);
	          });

	          if (subscriber) {
	            client.on("message", function (channel, message) {
	              var ref;
	              return (ref = _this2.limiters[channel]) != null ? ref._store.onMessage(message) : void 0;
	            });
	          }

	          if (client.ready) {
	            return resolve();
	          } else {
	            return client.once("ready", resolve);
	          }
	        });
	      }
	    }, {
	      key: "_loadScript",
	      value: function _loadScript(name) {
	        var _this3 = this;

	        return new this.Promise(function (resolve, reject) {
	          var payload;
	          payload = Scripts$1.payload(name);
	          return _this3.client.multi([["script", "load", payload]]).exec(function (err, replies) {
	            if (err != null) {
	              return reject(err);
	            }

	            _this3.shas[name] = replies[0];
	            return resolve(replies[0]);
	          });
	        });
	      }
	    }, {
	      key: "_loadScripts",
	      value: function _loadScripts() {
	        var _this4 = this;

	        return this.Promise.all(Scripts$1.names.map(function (k) {
	          return _this4._loadScript(k);
	        }));
	      }
	    }, {
	      key: "__addLimiter__",
	      value: function __addLimiter__(instance) {
	        var _this5 = this;

	        var channel;
	        channel = instance.channel();
	        return new this.Promise(function (resolve, reject) {
	          var _handler;

	          _handler = function handler(chan) {
	            if (chan === channel) {
	              _this5.subscriber.removeListener("subscribe", _handler);

	              _this5.limiters[channel] = instance;
	              return resolve();
	            }
	          };

	          _this5.subscriber.on("subscribe", _handler);

	          return _this5.subscriber.subscribe(channel);
	        });
	      }
	    }, {
	      key: "__removeLimiter__",
	      value: function () {
	        var _removeLimiter__ = _asyncToGenerator(
	        /*#__PURE__*/
	        regeneratorRuntime.mark(function _callee(instance) {
	          var _this6 = this;

	          var channel;
	          return regeneratorRuntime.wrap(function _callee$(_context) {
	            while (1) {
	              switch (_context.prev = _context.next) {
	                case 0:
	                  channel = instance.channel();

	                  if (this.terminated) {
	                    _context.next = 4;
	                    break;
	                  }

	                  _context.next = 4;
	                  return new this.Promise(function (resolve, reject) {
	                    return _this6.subscriber.unsubscribe(channel, function (err, chan) {
	                      if (err != null) {
	                        return reject(err);
	                      }

	                      if (chan === channel) {
	                        return resolve();
	                      }
	                    });
	                  });

	                case 4:
	                  return _context.abrupt("return", delete this.limiters[channel]);

	                case 5:
	                case "end":
	                  return _context.stop();
	              }
	            }
	          }, _callee, this);
	        }));

	        return function __removeLimiter__(_x) {
	          return _removeLimiter__.apply(this, arguments);
	        };
	      }()
	    }, {
	      key: "__scriptArgs__",
	      value: function __scriptArgs__(name, id, args, cb) {
	        var keys;
	        keys = Scripts$1.keys(name, id);
	        return [this.shas[name], keys.length].concat(keys, args, cb);
	      }
	    }, {
	      key: "__scriptFn__",
	      value: function __scriptFn__(name) {
	        return this.client.evalsha.bind(this.client);
	      }
	    }, {
	      key: "disconnect",
	      value: function disconnect() {
	        var flush = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
	        var i, k, len, ref;
	        ref = Object.keys(this.limiters);

	        for (i = 0, len = ref.length; i < len; i++) {
	          k = ref[i];
	          clearInterval(this.limiters[k]._store.heartbeat);
	        }

	        this.limiters = {};
	        this.terminated = true;
	        this.client.end(flush);
	        this.subscriber.end(flush);
	        return this.Promise.resolve();
	      }
	    }]);

	    return RedisConnection;
	  }();
	  RedisConnection.prototype.datastore = "redis";
	  RedisConnection.prototype.defaults = {
	    clientOptions: {},
	    client: null,
	    Promise: Promise,
	    Events: null
	  };
	  return RedisConnection;
	}.call(commonjsGlobal);

	var RedisConnection_1 = RedisConnection;

	var Events$3, IORedisConnection, Scripts$2, parser$3;
	parser$3 = parser;
	Events$3 = Events_1;
	Scripts$2 = Scripts;

	IORedisConnection = function () {
	  var IORedisConnection =
	  /*#__PURE__*/
	  function () {
	    function IORedisConnection() {
	      var _this = this;

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      _classCallCheck(this, IORedisConnection);

	      var Redis;
	      Redis = eval("require")("ioredis"); // Obfuscated or else Webpack/Angular will try to inline the optional ioredis module

	      parser$3.load(options, this.defaults, this);

	      if (this.Events == null) {
	        this.Events = new Events$3(this);
	      }

	      this.terminated = false;

	      if (this.clusterNodes != null) {
	        this.client = new Redis.Cluster(this.clusterNodes, this.clientOptions);
	        this.subscriber = new Redis.Cluster(this.clusterNodes, this.clientOptions);
	      } else {
	        if (this.client == null) {
	          this.client = new Redis(this.clientOptions);
	        }

	        this.subscriber = this.client.duplicate();
	      }

	      this.limiters = {};
	      this.ready = this.Promise.all([this._setup(this.client, false), this._setup(this.subscriber, true)]).then(function () {
	        _this._loadScripts();

	        return {
	          client: _this.client,
	          subscriber: _this.subscriber
	        };
	      });
	    }

	    _createClass(IORedisConnection, [{
	      key: "_setup",
	      value: function _setup(client, subscriber) {
	        var _this2 = this;

	        return new this.Promise(function (resolve, reject) {
	          client.on("error", function (e) {
	            return _this2.Events.trigger("error", [e]);
	          });

	          if (subscriber) {
	            client.on("message", function (channel, message) {
	              var ref;
	              return (ref = _this2.limiters[channel]) != null ? ref._store.onMessage(message) : void 0;
	            });
	          }

	          if (client.status === "ready") {
	            return resolve();
	          } else {
	            return client.once("ready", resolve);
	          }
	        });
	      }
	    }, {
	      key: "_loadScripts",
	      value: function _loadScripts() {
	        var _this3 = this;

	        return Scripts$2.names.forEach(function (name) {
	          return _this3.client.defineCommand(name, {
	            lua: Scripts$2.payload(name)
	          });
	        });
	      }
	    }, {
	      key: "__addLimiter__",
	      value: function __addLimiter__(instance) {
	        var _this4 = this;

	        var channel;
	        channel = instance.channel();
	        return new this.Promise(function (resolve, reject) {
	          return _this4.subscriber.subscribe(channel, function () {
	            _this4.limiters[channel] = instance;
	            return resolve();
	          });
	        });
	      }
	    }, {
	      key: "__removeLimiter__",
	      value: function () {
	        var _removeLimiter__ = _asyncToGenerator(
	        /*#__PURE__*/
	        regeneratorRuntime.mark(function _callee(instance) {
	          var channel;
	          return regeneratorRuntime.wrap(function _callee$(_context) {
	            while (1) {
	              switch (_context.prev = _context.next) {
	                case 0:
	                  channel = instance.channel();

	                  if (this.terminated) {
	                    _context.next = 4;
	                    break;
	                  }

	                  _context.next = 4;
	                  return this.subscriber.unsubscribe(channel);

	                case 4:
	                  return _context.abrupt("return", delete this.limiters[channel]);

	                case 5:
	                case "end":
	                  return _context.stop();
	              }
	            }
	          }, _callee, this);
	        }));

	        return function __removeLimiter__(_x) {
	          return _removeLimiter__.apply(this, arguments);
	        };
	      }()
	    }, {
	      key: "__scriptArgs__",
	      value: function __scriptArgs__(name, id, args, cb) {
	        var keys;
	        keys = Scripts$2.keys(name, id);
	        return [keys.length].concat(keys, args, cb);
	      }
	    }, {
	      key: "__scriptFn__",
	      value: function __scriptFn__(name) {
	        return this.client[name].bind(this.client);
	      }
	    }, {
	      key: "disconnect",
	      value: function disconnect() {
	        var flush = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
	        var i, k, len, ref;
	        ref = Object.keys(this.limiters);

	        for (i = 0, len = ref.length; i < len; i++) {
	          k = ref[i];
	          clearInterval(this.limiters[k]._store.heartbeat);
	        }

	        this.limiters = {};
	        this.terminated = true;

	        if (flush) {
	          return this.Promise.all([this.client.quit(), this.subscriber.quit()]);
	        } else {
	          this.client.disconnect();
	          this.subscriber.disconnect();
	          return this.Promise.resolve();
	        }
	      }
	    }]);

	    return IORedisConnection;
	  }();
	  IORedisConnection.prototype.datastore = "ioredis";
	  IORedisConnection.prototype.defaults = {
	    clientOptions: {},
	    clusterNodes: null,
	    client: null,
	    Promise: Promise,
	    Events: null
	  };
	  return IORedisConnection;
	}.call(commonjsGlobal);

	var IORedisConnection_1 = IORedisConnection;

	var BottleneckError$2, IORedisConnection$1, RedisConnection$1, RedisDatastore, parser$4;
	parser$4 = parser;
	BottleneckError$2 = BottleneckError_1;
	RedisConnection$1 = RedisConnection_1;
	IORedisConnection$1 = IORedisConnection_1;

	RedisDatastore =
	/*#__PURE__*/
	function () {
	  function RedisDatastore(instance, storeOptions, storeInstanceOptions) {
	    var _this = this;

	    _classCallCheck(this, RedisDatastore);

	    this.instance = instance;
	    this.storeOptions = storeOptions;
	    this.originalId = this.instance.id;
	    parser$4.load(storeInstanceOptions, storeInstanceOptions, this);
	    this.clients = {};
	    this.sharedConnection = this.connection != null;

	    if (this.connection == null) {
	      this.connection = this.instance.datastore === "redis" ? new RedisConnection$1({
	        clientOptions: this.clientOptions,
	        Promise: this.Promise,
	        Events: this.instance.Events
	      }) : this.instance.datastore === "ioredis" ? new IORedisConnection$1({
	        clientOptions: this.clientOptions,
	        clusterNodes: this.clusterNodes,
	        Promise: this.Promise,
	        Events: this.instance.Events
	      }) : void 0;
	    }

	    this.instance.connection = this.connection;
	    this.instance.datastore = this.connection.datastore;
	    this.ready = this.connection.ready.then(function (clients) {
	      _this.clients = clients;
	      return _this.runScript("init", _this.prepareInitSettings(_this.clearDatastore));
	    }).then(function () {
	      return _this.connection.__addLimiter__(_this.instance);
	    }).then(function () {
	      var base;

	      if (typeof (base = _this.heartbeat = setInterval(function () {
	        return _this.runScript("heartbeat", []).catch(function (e) {
	          return _this.instance.Events.trigger("error", [e]);
	        });
	      }, _this.heartbeatInterval)).unref === "function") {
	        base.unref();
	      }

	      return _this.clients;
	    });
	  }

	  _createClass(RedisDatastore, [{
	    key: "__publish__",
	    value: function () {
	      var _publish__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee(message) {
	        var client, _ref;

	        return regeneratorRuntime.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                _context.next = 2;
	                return this.ready;

	              case 2:
	                _ref = _context.sent;
	                client = _ref.client;
	                return _context.abrupt("return", client.publish(this.instance.channel(), "message:".concat(message.toString())));

	              case 5:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee, this);
	      }));

	      return function __publish__(_x) {
	        return _publish__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "onMessage",
	    value: function onMessage(message) {
	      var data, pos, type;
	      pos = message.indexOf(":");
	      var _ref2 = [message.slice(0, pos), message.slice(pos + 1)];
	      type = _ref2[0];
	      data = _ref2[1];

	      if (type === "capacity") {
	        return this.instance._drainAll(data.length > 0 ? ~~data : void 0);
	      } else if (type === "message") {
	        return this.instance.Events.trigger("message", [data]);
	      } else if (type === "blocked") {
	        return this.instance._dropAllQueued();
	      }
	    }
	  }, {
	    key: "__disconnect__",
	    value: function __disconnect__(flush) {
	      clearInterval(this.heartbeat);

	      if (this.sharedConnection) {
	        return this.connection.__removeLimiter__(this.instance);
	      } else {
	        return this.connection.disconnect(flush);
	      }
	    }
	  }, {
	    key: "runScript",
	    value: function () {
	      var _runScript = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee2(name, args) {
	        var _this2 = this;

	        return regeneratorRuntime.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                if (name === "init" || name === "heartbeat") {
	                  _context2.next = 3;
	                  break;
	                }

	                _context2.next = 3;
	                return this.ready;

	              case 3:
	                args.unshift(Date.now().toString());
	                return _context2.abrupt("return", new this.Promise(function (resolve, reject) {
	                  var arr;

	                  _this2.instance.Events.trigger("debug", ["Calling Redis script: ".concat(name, ".lua"), args]);

	                  arr = _this2.connection.__scriptArgs__(name, _this2.originalId, args, function (err, replies) {
	                    if (err != null) {
	                      return reject(err);
	                    }

	                    return resolve(replies);
	                  });
	                  return _this2.connection.__scriptFn__(name).apply({}, arr);
	                }).catch(function (e) {
	                  if (e.message === "SETTINGS_KEY_NOT_FOUND") {
	                    return _this2.runScript("init", _this2.prepareInitSettings(false)).then(function () {
	                      return _this2.runScript(name, args);
	                    });
	                  } else {
	                    return _this2.Promise.reject(e);
	                  }
	                }));

	              case 5:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2, this);
	      }));

	      return function runScript(_x2, _x3) {
	        return _runScript.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "prepareArray",
	    value: function prepareArray(arr) {
	      var i, len, results, x;
	      results = [];

	      for (i = 0, len = arr.length; i < len; i++) {
	        x = arr[i];
	        results.push(x != null ? x.toString() : "");
	      }

	      return results;
	    }
	  }, {
	    key: "prepareObject",
	    value: function prepareObject(obj) {
	      var arr, k, v;
	      arr = [];

	      for (k in obj) {
	        v = obj[k];
	        arr.push(k, v != null ? v.toString() : "");
	      }

	      return arr;
	    }
	  }, {
	    key: "prepareInitSettings",
	    value: function prepareInitSettings(clear) {
	      var args;
	      args = this.prepareObject(Object.assign({}, this.storeOptions, {
	        id: this.originalId,
	        version: this.instance.version,
	        groupTimeout: this.timeout
	      }));
	      args.unshift(clear ? 1 : 0, this.instance.version);
	      return args;
	    }
	  }, {
	    key: "convertBool",
	    value: function convertBool(b) {
	      return !!b;
	    }
	  }, {
	    key: "__updateSettings__",
	    value: function () {
	      var _updateSettings__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee3(options) {
	        return regeneratorRuntime.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                _context3.next = 2;
	                return this.runScript("update_settings", this.prepareObject(options));

	              case 2:
	                return _context3.abrupt("return", parser$4.overwrite(options, options, this.storeOptions));

	              case 3:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3, this);
	      }));

	      return function __updateSettings__(_x4) {
	        return _updateSettings__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__running__",
	    value: function __running__() {
	      return this.runScript("running", []);
	    }
	  }, {
	    key: "__done__",
	    value: function __done__() {
	      return this.runScript("done", []);
	    }
	  }, {
	    key: "__groupCheck__",
	    value: function () {
	      var _groupCheck__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee4() {
	        return regeneratorRuntime.wrap(function _callee4$(_context4) {
	          while (1) {
	            switch (_context4.prev = _context4.next) {
	              case 0:
	                _context4.t0 = this;
	                _context4.next = 3;
	                return this.runScript("group_check", []);

	              case 3:
	                _context4.t1 = _context4.sent;
	                return _context4.abrupt("return", _context4.t0.convertBool.call(_context4.t0, _context4.t1));

	              case 5:
	              case "end":
	                return _context4.stop();
	            }
	          }
	        }, _callee4, this);
	      }));

	      return function __groupCheck__() {
	        return _groupCheck__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__incrementReservoir__",
	    value: function __incrementReservoir__(incr) {
	      return this.runScript("increment_reservoir", [incr]);
	    }
	  }, {
	    key: "__currentReservoir__",
	    value: function __currentReservoir__() {
	      return this.runScript("current_reservoir", []);
	    }
	  }, {
	    key: "__check__",
	    value: function () {
	      var _check__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee5(weight) {
	        return regeneratorRuntime.wrap(function _callee5$(_context5) {
	          while (1) {
	            switch (_context5.prev = _context5.next) {
	              case 0:
	                _context5.t0 = this;
	                _context5.next = 3;
	                return this.runScript("check", this.prepareArray([weight]));

	              case 3:
	                _context5.t1 = _context5.sent;
	                return _context5.abrupt("return", _context5.t0.convertBool.call(_context5.t0, _context5.t1));

	              case 5:
	              case "end":
	                return _context5.stop();
	            }
	          }
	        }, _callee5, this);
	      }));

	      return function __check__(_x5) {
	        return _check__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__register__",
	    value: function () {
	      var _register__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee6(index, weight, expiration) {
	        var reservoir, success, wait, _ref3, _ref4;

	        return regeneratorRuntime.wrap(function _callee6$(_context6) {
	          while (1) {
	            switch (_context6.prev = _context6.next) {
	              case 0:
	                _context6.next = 2;
	                return this.runScript("register", this.prepareArray([index, weight, expiration]));

	              case 2:
	                _ref3 = _context6.sent;
	                _ref4 = _slicedToArray(_ref3, 3);
	                success = _ref4[0];
	                wait = _ref4[1];
	                reservoir = _ref4[2];
	                return _context6.abrupt("return", {
	                  success: this.convertBool(success),
	                  wait: wait,
	                  reservoir: reservoir
	                });

	              case 8:
	              case "end":
	                return _context6.stop();
	            }
	          }
	        }, _callee6, this);
	      }));

	      return function __register__(_x6, _x7, _x8) {
	        return _register__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__submit__",
	    value: function () {
	      var _submit__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee7(queueLength, weight) {
	        var blocked, e, maxConcurrent, overweight, reachedHWM, strategy, _ref5, _ref6, _e$message$split, _e$message$split2;

	        return regeneratorRuntime.wrap(function _callee7$(_context7) {
	          while (1) {
	            switch (_context7.prev = _context7.next) {
	              case 0:
	                _context7.prev = 0;
	                _context7.next = 3;
	                return this.runScript("submit", this.prepareArray([queueLength, weight]));

	              case 3:
	                _ref5 = _context7.sent;
	                _ref6 = _slicedToArray(_ref5, 3);
	                reachedHWM = _ref6[0];
	                blocked = _ref6[1];
	                strategy = _ref6[2];
	                return _context7.abrupt("return", {
	                  reachedHWM: this.convertBool(reachedHWM),
	                  blocked: this.convertBool(blocked),
	                  strategy: strategy
	                });

	              case 11:
	                _context7.prev = 11;
	                _context7.t0 = _context7["catch"](0);
	                e = _context7.t0;

	                if (!(e.message.indexOf("OVERWEIGHT") === 0)) {
	                  _context7.next = 23;
	                  break;
	                }

	                _e$message$split = e.message.split(":");
	                _e$message$split2 = _slicedToArray(_e$message$split, 3);
	                overweight = _e$message$split2[0];
	                weight = _e$message$split2[1];
	                maxConcurrent = _e$message$split2[2];
	                throw new BottleneckError$2("Impossible to add a job having a weight of ".concat(weight, " to a limiter having a maxConcurrent setting of ").concat(maxConcurrent));

	              case 23:
	                throw e;

	              case 24:
	              case "end":
	                return _context7.stop();
	            }
	          }
	        }, _callee7, this, [[0, 11]]);
	      }));

	      return function __submit__(_x9, _x10) {
	        return _submit__.apply(this, arguments);
	      };
	    }()
	  }, {
	    key: "__free__",
	    value: function () {
	      var _free__ = _asyncToGenerator(
	      /*#__PURE__*/
	      regeneratorRuntime.mark(function _callee8(index, weight) {
	        var running;
	        return regeneratorRuntime.wrap(function _callee8$(_context8) {
	          while (1) {
	            switch (_context8.prev = _context8.next) {
	              case 0:
	                _context8.next = 2;
	                return this.runScript("free", this.prepareArray([index]));

	              case 2:
	                running = _context8.sent;
	                return _context8.abrupt("return", {
	                  running: running
	                });

	              case 4:
	              case "end":
	                return _context8.stop();
	            }
	          }
	        }, _callee8, this);
	      }));

	      return function __free__(_x11, _x12) {
	        return _free__.apply(this, arguments);
	      };
	    }()
	  }]);

	  return RedisDatastore;
	}();

	var RedisDatastore_1 = RedisDatastore;

	var BottleneckError$3, States;
	BottleneckError$3 = BottleneckError_1;

	States =
	/*#__PURE__*/
	function () {
	  function States(status1) {
	    _classCallCheck(this, States);

	    this.status = status1;
	    this.jobs = {};
	    this.counts = this.status.map(function () {
	      return 0;
	    });
	  }

	  _createClass(States, [{
	    key: "next",
	    value: function next(id) {
	      var current, next;
	      current = this.jobs[id];
	      next = current + 1;

	      if (current != null && next < this.status.length) {
	        this.counts[current]--;
	        this.counts[next]++;
	        return this.jobs[id]++;
	      } else if (current != null) {
	        this.counts[current]--;
	        return delete this.jobs[id];
	      }
	    }
	  }, {
	    key: "start",
	    value: function start(id) {
	      var initial = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
	      this.jobs[id] = initial;
	      return this.counts[initial]++;
	    }
	  }, {
	    key: "remove",
	    value: function remove(id) {
	      var current;
	      current = this.jobs[id];

	      if (current != null) {
	        this.counts[current]--;
	        delete this.jobs[id];
	      }

	      return current != null;
	    }
	  }, {
	    key: "jobStatus",
	    value: function jobStatus(id) {
	      var ref;
	      return (ref = this.status[this.jobs[id]]) != null ? ref : null;
	    }
	  }, {
	    key: "statusJobs",
	    value: function statusJobs(status) {
	      var index, k, ref, results, v;

	      if (status != null) {
	        index = this.status.indexOf(status);

	        if (index < 0) {
	          throw new BottleneckError$3("status must be one of ".concat(this.status.join(', ')));
	        }

	        ref = this.jobs;
	        results = [];

	        for (k in ref) {
	          v = ref[k];

	          if (v === index) {
	            results.push(k);
	          }
	        }

	        return results;
	      } else {
	        return Object.keys(this.jobs);
	      }
	    }
	  }, {
	    key: "statusCounts",
	    value: function statusCounts() {
	      var _this = this;

	      return this.counts.reduce(function (acc, v, i) {
	        acc[_this.status[i]] = v;
	        return acc;
	      }, {});
	    }
	  }]);

	  return States;
	}();

	var States_1 = States;

	var DLList$2,
	    Sync,
	    splice = [].splice;
	DLList$2 = DLList_1;

	Sync =
	/*#__PURE__*/
	function () {
	  function Sync(name, instance) {
	    _classCallCheck(this, Sync);

	    this.submit = this.submit.bind(this);
	    this.name = name;
	    this.instance = instance;
	    this._running = 0;
	    this._queue = new DLList$2();
	  }

	  _createClass(Sync, [{
	    key: "isEmpty",
	    value: function isEmpty() {
	      return this._queue.length === 0;
	    }
	  }, {
	    key: "_tryToRun",
	    value: function _tryToRun() {
	      var _this = this;

	      var next;

	      if (this._running < 1 && this._queue.length > 0) {
	        this._running++;
	        next = this._queue.shift();
	        return next.task.apply({}, next.args.concat(function () {
	          var ref;
	          _this._running--;

	          _this._tryToRun();

	          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	            args[_key] = arguments[_key];
	          }

	          return (ref = next.cb) != null ? ref.apply({}, args) : void 0;
	        }));
	      }
	    }
	  }, {
	    key: "submit",
	    value: function submit(task) {
	      var _ref, _ref2, _splice$call, _splice$call2;

	      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	        args[_key2 - 1] = arguments[_key2];
	      }

	      var cb, ref;
	      ref = args, (_ref = ref, _ref2 = _toArray(_ref), args = _ref2.slice(0), _ref), (_splice$call = splice.call(args, -1), _splice$call2 = _slicedToArray(_splice$call, 1), cb = _splice$call2[0], _splice$call);

	      this._queue.push({
	        task: task,
	        args: args,
	        cb: cb
	      });

	      return this._tryToRun();
	    }
	  }, {
	    key: "schedule",
	    value: function schedule(task) {
	      var _this2 = this;

	      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
	        args[_key3 - 1] = arguments[_key3];
	      }

	      var wrapped;

	      wrapped = function wrapped() {
	        var _ref3, _ref4, _splice$call3, _splice$call4;

	        for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
	          args[_key4] = arguments[_key4];
	        }

	        var cb, ref;
	        ref = args, (_ref3 = ref, _ref4 = _toArray(_ref3), args = _ref4.slice(0), _ref3), (_splice$call3 = splice.call(args, -1), _splice$call4 = _slicedToArray(_splice$call3, 1), cb = _splice$call4[0], _splice$call3);
	        return task.apply({}, args).then(function () {
	          for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
	            args[_key5] = arguments[_key5];
	          }

	          return cb.apply({}, Array.prototype.concat(null, args));
	        }).catch(function () {
	          for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
	            args[_key6] = arguments[_key6];
	          }

	          return cb.apply({}, args);
	        });
	      };

	      return new this.instance.Promise(function (resolve, reject) {
	        return _this2.submit.apply({}, Array.prototype.concat(wrapped, args, function () {
	          for (var _len7 = arguments.length, args = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
	            args[_key7] = arguments[_key7];
	          }

	          return (args[0] != null ? reject : (args.shift(), resolve)).apply({}, args);
	        }));
	      });
	    }
	  }]);

	  return Sync;
	}();

	var Sync_1 = Sync;

	var name = "bottleneck";
	var version = "2.13.0";
	var description = "Distributed task scheduler and rate limiter";
	var main = "lib/index.js";
	var typings = "bottleneck.d.ts";
	var scripts = {
		test: "./node_modules/mocha/bin/mocha test",
		"test-all": "DATASTORE=ioredis npm test && DATASTORE=redis npm test && BUILD=bundle npm test && npm test"
	};
	var repository = {
		type: "git",
		url: "https://github.com/SGrondin/bottleneck"
	};
	var keywords = [
		"async rate limiter",
		"rate limiter",
		"rate limiting",
		"async",
		"rate",
		"limiting",
		"limiter",
		"throttle",
		"throttling",
		"throttler",
		"load",
		"clustering"
	];
	var author = {
		name: "Simon Grondin"
	};
	var license = "MIT";
	var bugs = {
		url: "https://github.com/SGrondin/bottleneck/issues"
	};
	var devDependencies = {
		"@babel/core": "^7.1.2",
		"@babel/preset-env": "7.1.x",
		"@types/es6-promise": "0.0.33",
		assert: "1.4.x",
		coffeescript: "2.3.x",
		"ejs-cli": "2.0.1",
		ioredis: "^4.0.0",
		mocha: "4.x",
		redis: "^2.8.0",
		"regenerator-runtime": "^0.12.1",
		rollup: "^0.66.6",
		"rollup-plugin-babel": "4.0.x",
		"rollup-plugin-commonjs": "^9.2.0",
		"rollup-plugin-json": "^3.1.0",
		"rollup-plugin-node-resolve": "^3.4.0",
		typescript: "^2.6.2"
	};
	var dependencies = {
	};
	var _package = {
		name: name,
		version: version,
		description: description,
		main: main,
		typings: typings,
		scripts: scripts,
		repository: repository,
		keywords: keywords,
		author: author,
		license: license,
		bugs: bugs,
		devDependencies: devDependencies,
		dependencies: dependencies
	};

	var _package$1 = /*#__PURE__*/Object.freeze({
		name: name,
		version: version,
		description: description,
		main: main,
		typings: typings,
		scripts: scripts,
		repository: repository,
		keywords: keywords,
		author: author,
		license: license,
		bugs: bugs,
		devDependencies: devDependencies,
		dependencies: dependencies,
		default: _package
	});

	var Events$4, Group, IORedisConnection$2, RedisConnection$2, parser$5;
	parser$5 = parser;
	Events$4 = Events_1;
	RedisConnection$2 = RedisConnection_1;
	IORedisConnection$2 = IORedisConnection_1;

	Group = function () {
	  var Group =
	  /*#__PURE__*/
	  function () {
	    function Group() {
	      var limiterOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      _classCallCheck(this, Group);

	      this.deleteKey = this.deleteKey.bind(this);
	      this.updateSettings = this.updateSettings.bind(this);
	      this.limiterOptions = limiterOptions;
	      parser$5.load(this.limiterOptions, this.defaults, this);
	      this.Events = new Events$4(this);
	      this.instances = {};
	      this.Bottleneck = Bottleneck_1;

	      this._startAutoCleanup();

	      this.sharedConnection = this.connection != null;

	      if (this.connection == null) {
	        if (this.limiterOptions.datastore === "redis") {
	          this.connection = new RedisConnection$2(Object.assign({}, this.limiterOptions, {
	            Events: this.Events
	          }));
	        } else if (this.limiterOptions.datastore === "ioredis") {
	          this.connection = new IORedisConnection$2(Object.assign({}, this.limiterOptions, {
	            Events: this.Events
	          }));
	        }
	      }
	    }

	    _createClass(Group, [{
	      key: "key",
	      value: function key() {
	        var _this = this;

	        var _key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

	        var ref;
	        return (ref = this.instances[_key]) != null ? ref : function () {
	          var limiter;
	          limiter = _this.instances[_key] = new _this.Bottleneck(Object.assign(_this.limiterOptions, {
	            id: "".concat(_this.id, "-").concat(_key),
	            timeout: _this.timeout,
	            connection: _this.connection
	          }));

	          _this.Events.trigger("created", [limiter, _key]);

	          return limiter;
	        }();
	      }
	    }, {
	      key: "deleteKey",
	      value: function deleteKey() {
	        var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
	        var instance;
	        instance = this.instances[key];
	        delete this.instances[key];
	        return instance != null ? instance.disconnect() : void 0;
	      }
	    }, {
	      key: "limiters",
	      value: function limiters() {
	        var k, ref, results, v;
	        ref = this.instances;
	        results = [];

	        for (k in ref) {
	          v = ref[k];
	          results.push({
	            key: k,
	            limiter: v
	          });
	        }

	        return results;
	      }
	    }, {
	      key: "keys",
	      value: function keys() {
	        return Object.keys(this.instances);
	      }
	    }, {
	      key: "_startAutoCleanup",
	      value: function _startAutoCleanup() {
	        var _this2 = this;

	        var base;
	        clearInterval(this.interval);
	        return typeof (base = this.interval = setInterval(
	        /*#__PURE__*/
	        _asyncToGenerator(
	        /*#__PURE__*/
	        regeneratorRuntime.mark(function _callee() {
	          var e, k, ref, results, time, v;
	          return regeneratorRuntime.wrap(function _callee$(_context) {
	            while (1) {
	              switch (_context.prev = _context.next) {
	                case 0:
	                  time = Date.now();
	                  ref = _this2.instances;
	                  results = [];
	                  _context.t0 = regeneratorRuntime.keys(ref);

	                case 4:
	                  if ((_context.t1 = _context.t0()).done) {
	                    _context.next = 23;
	                    break;
	                  }

	                  k = _context.t1.value;
	                  v = ref[k];
	                  _context.prev = 7;
	                  _context.next = 10;
	                  return v._store.__groupCheck__(time);

	                case 10:
	                  if (!_context.sent) {
	                    _context.next = 14;
	                    break;
	                  }

	                  results.push(_this2.deleteKey(k));
	                  _context.next = 15;
	                  break;

	                case 14:
	                  results.push(void 0);

	                case 15:
	                  _context.next = 21;
	                  break;

	                case 17:
	                  _context.prev = 17;
	                  _context.t2 = _context["catch"](7);
	                  e = _context.t2;
	                  results.push(v.Events.trigger("error", [e]));

	                case 21:
	                  _context.next = 4;
	                  break;

	                case 23:
	                  return _context.abrupt("return", results);

	                case 24:
	                case "end":
	                  return _context.stop();
	              }
	            }
	          }, _callee, this, [[7, 17]]);
	        })), this.timeout / 2)).unref === "function" ? base.unref() : void 0;
	      }
	    }, {
	      key: "updateSettings",
	      value: function updateSettings() {
	        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	        parser$5.overwrite(options, this.defaults, this);
	        parser$5.overwrite(options, options, this.limiterOptions);

	        if (options.timeout != null) {
	          return this._startAutoCleanup();
	        }
	      }
	    }, {
	      key: "disconnect",
	      value: function disconnect() {
	        var flush = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
	        var ref;

	        if (!this.sharedConnection) {
	          return (ref = this.connection) != null ? ref.disconnect(flush) : void 0;
	        }
	      }
	    }]);

	    return Group;
	  }();
	  Group.prototype.defaults = {
	    timeout: 1000 * 60 * 5,
	    connection: null,
	    id: "group-key"
	  };
	  return Group;
	}.call(commonjsGlobal);

	var Group_1 = Group;

	var Batcher, Events$5, parser$6;
	parser$6 = parser;
	Events$5 = Events_1;

	Batcher = function () {
	  var Batcher =
	  /*#__PURE__*/
	  function () {
	    function Batcher() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      _classCallCheck(this, Batcher);

	      this.options = options;
	      parser$6.load(this.options, this.defaults, this);
	      this.Events = new Events$5(this);
	      this._arr = [];

	      this._resetPromise();

	      this._lastFlush = Date.now();
	    }

	    _createClass(Batcher, [{
	      key: "_resetPromise",
	      value: function _resetPromise() {
	        var _this = this;

	        return this._promise = new this.Promise(function (res, rej) {
	          return _this._resolve = res;
	        });
	      }
	    }, {
	      key: "_flush",
	      value: function _flush() {
	        clearTimeout(this._timeout);
	        this._lastFlush = Date.now();

	        this._resolve();

	        this.Events.trigger("batch", [this._arr]);
	        this._arr = [];
	        return this._resetPromise();
	      }
	    }, {
	      key: "add",
	      value: function add(data) {
	        var _this2 = this;

	        var ret;

	        this._arr.push(data);

	        ret = this._promise;

	        if (this._arr.length === this.maxSize) {
	          this._flush();
	        } else if (this.maxTime != null && this._arr.length === 1) {
	          this._timeout = setTimeout(function () {
	            return _this2._flush();
	          }, this.maxTime);
	        }

	        return ret;
	      }
	    }]);

	    return Batcher;
	  }();
	  Batcher.prototype.defaults = {
	    maxTime: null,
	    maxSize: null,
	    Promise: Promise
	  };
	  return Batcher;
	}.call(commonjsGlobal);

	var Batcher_1 = Batcher;

	var require$$7 = getCjsExportFromNamespace(_package$1);

	var Bottleneck,
	    DEFAULT_PRIORITY,
	    Events$6,
	    LocalDatastore$1,
	    NUM_PRIORITIES,
	    Queues$1,
	    RedisDatastore$1,
	    States$1,
	    Sync$1,
	    packagejson,
	    parser$7,
	    splice$1 = [].splice;
	NUM_PRIORITIES = 10;
	DEFAULT_PRIORITY = 5;
	parser$7 = parser;
	Queues$1 = Queues_1;
	LocalDatastore$1 = LocalDatastore_1;
	RedisDatastore$1 = RedisDatastore_1;
	Events$6 = Events_1;
	States$1 = States_1;
	Sync$1 = Sync_1;
	packagejson = require$$7;

	Bottleneck = function () {
	  var Bottleneck =
	  /*#__PURE__*/
	  function () {
	    function Bottleneck() {
	      var _this = this;

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      _classCallCheck(this, Bottleneck);

	      var storeInstanceOptions, storeOptions;
	      this._drainOne = this._drainOne.bind(this);
	      this.submit = this.submit.bind(this);
	      this.schedule = this.schedule.bind(this);
	      this.updateSettings = this.updateSettings.bind(this);
	      this.incrementReservoir = this.incrementReservoir.bind(this);

	      for (var _len = arguments.length, invalid = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	        invalid[_key - 1] = arguments[_key];
	      }

	      this._validateOptions(options, invalid);

	      parser$7.load(options, this.instanceDefaults, this);
	      this._queues = new Queues$1(NUM_PRIORITIES);
	      this._scheduled = {};
	      this._states = new States$1(["RECEIVED", "QUEUED", "RUNNING", "EXECUTING"].concat(this.trackDoneStatus ? ["DONE"] : []));
	      this._limiter = null;
	      this.Events = new Events$6(this);
	      this._submitLock = new Sync$1("submit", this);
	      this._registerLock = new Sync$1("register", this);
	      storeOptions = parser$7.load(options, this.storeDefaults, {});

	      this._store = function () {
	        if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
	          storeInstanceOptions = parser$7.load(options, this.redisStoreDefaults, {});
	          return new RedisDatastore$1(this, storeOptions, storeInstanceOptions);
	        } else if (this.datastore === "local") {
	          storeInstanceOptions = parser$7.load(options, this.localStoreDefaults, {});
	          return new LocalDatastore$1(this, storeOptions, storeInstanceOptions);
	        } else {
	          throw new Bottleneck.prototype.BottleneckError("Invalid datastore type: ".concat(this.datastore));
	        }
	      }.call(this);

	      this._queues.on("leftzero", function () {
	        var base;
	        return typeof (base = _this._store.heartbeat).ref === "function" ? base.ref() : void 0;
	      });

	      this._queues.on("zero", function () {
	        var base;
	        return typeof (base = _this._store.heartbeat).unref === "function" ? base.unref() : void 0;
	      });
	    }

	    _createClass(Bottleneck, [{
	      key: "_validateOptions",
	      value: function _validateOptions(options, invalid) {
	        if (!(options != null && _typeof(options) === "object" && invalid.length === 0)) {
	          throw new Bottleneck.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
	        }
	      }
	    }, {
	      key: "ready",
	      value: function ready() {
	        return this._store.ready;
	      }
	    }, {
	      key: "clients",
	      value: function clients() {
	        return this._store.clients;
	      }
	    }, {
	      key: "channel",
	      value: function channel() {
	        return "b_".concat(this.id);
	      }
	    }, {
	      key: "publish",
	      value: function publish(message) {
	        return this._store.__publish__(message);
	      }
	    }, {
	      key: "disconnect",
	      value: function disconnect() {
	        var flush = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
	        return this._store.__disconnect__(flush);
	      }
	    }, {
	      key: "chain",
	      value: function chain(_limiter) {
	        this._limiter = _limiter;
	        return this;
	      }
	    }, {
	      key: "queued",
	      value: function queued(priority) {
	        return this._queues.queued(priority);
	      }
	    }, {
	      key: "empty",
	      value: function empty() {
	        return this.queued() === 0 && this._submitLock.isEmpty();
	      }
	    }, {
	      key: "running",
	      value: function running() {
	        return this._store.__running__();
	      }
	    }, {
	      key: "done",
	      value: function done() {
	        return this._store.__done__();
	      }
	    }, {
	      key: "jobStatus",
	      value: function jobStatus(id) {
	        return this._states.jobStatus(id);
	      }
	    }, {
	      key: "jobs",
	      value: function jobs(status) {
	        return this._states.statusJobs(status);
	      }
	    }, {
	      key: "counts",
	      value: function counts() {
	        return this._states.statusCounts();
	      }
	    }, {
	      key: "_sanitizePriority",
	      value: function _sanitizePriority(priority) {
	        var sProperty;
	        sProperty = ~~priority !== priority ? DEFAULT_PRIORITY : priority;

	        if (sProperty < 0) {
	          return 0;
	        } else if (sProperty > NUM_PRIORITIES - 1) {
	          return NUM_PRIORITIES - 1;
	        } else {
	          return sProperty;
	        }
	      }
	    }, {
	      key: "_randomIndex",
	      value: function _randomIndex() {
	        return Math.random().toString(36).slice(2);
	      }
	    }, {
	      key: "check",
	      value: function check() {
	        var weight = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
	        return this._store.__check__(weight);
	      }
	    }, {
	      key: "_run",
	      value: function _run(next, wait, index) {
	        var _this2 = this;

	        var completed, done;
	        this.Events.trigger("debug", ["Scheduling ".concat(next.options.id), {
	          args: next.args,
	          options: next.options
	        }]);
	        done = false;

	        completed =
	        /*#__PURE__*/
	        function () {
	          var _ref = _asyncToGenerator(
	          /*#__PURE__*/
	          regeneratorRuntime.mark(function _callee() {
	            var e,
	                ref,
	                running,
	                _ref2,
	                _len2,
	                args,
	                _key2,
	                _args = arguments;

	            return regeneratorRuntime.wrap(function _callee$(_context) {
	              while (1) {
	                switch (_context.prev = _context.next) {
	                  case 0:
	                    if (done) {
	                      _context.next = 22;
	                      break;
	                    }

	                    _context.prev = 1;
	                    done = true;

	                    _this2._states.next(next.options.id); // DONE


	                    clearTimeout(_this2._scheduled[index].expiration);
	                    delete _this2._scheduled[index];

	                    _this2.Events.trigger("debug", ["Completed ".concat(next.options.id), {
	                      args: next.args,
	                      options: next.options
	                    }]);

	                    _this2.Events.trigger("done", ["Completed ".concat(next.options.id), {
	                      args: next.args,
	                      options: next.options
	                    }]);

	                    _context.next = 10;
	                    return _this2._store.__free__(index, next.options.weight);

	                  case 10:
	                    _ref2 = _context.sent;
	                    running = _ref2.running;

	                    _this2.Events.trigger("debug", ["Freed ".concat(next.options.id), {
	                      args: next.args,
	                      options: next.options
	                    }]);

	                    if (running === 0 && _this2.empty()) {
	                      _this2.Events.trigger("idle", []);
	                    }

	                    for (_len2 = _args.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	                      args[_key2] = _args[_key2];
	                    }

	                    return _context.abrupt("return", (ref = next.cb) != null ? ref.apply({}, args) : void 0);

	                  case 18:
	                    _context.prev = 18;
	                    _context.t0 = _context["catch"](1);
	                    e = _context.t0;
	                    return _context.abrupt("return", _this2.Events.trigger("error", [e]));

	                  case 22:
	                  case "end":
	                    return _context.stop();
	                }
	              }
	            }, _callee, this, [[1, 18]]);
	          }));

	          return function completed() {
	            return _ref.apply(this, arguments);
	          };
	        }();

	        this._states.next(next.options.id); // RUNNING


	        return this._scheduled[index] = {
	          timeout: setTimeout(function () {
	            _this2.Events.trigger("debug", ["Executing ".concat(next.options.id), {
	              args: next.args,
	              options: next.options
	            }]);

	            _this2._states.next(next.options.id); // EXECUTING


	            if (_this2._limiter != null) {
	              return _this2._limiter.submit.apply(_this2._limiter, Array.prototype.concat(next.options, next.task, next.args, completed));
	            } else {
	              return next.task.apply({}, next.args.concat(completed));
	            }
	          }, wait),
	          expiration: next.options.expiration != null ? setTimeout(function () {
	            return completed(new Bottleneck.prototype.BottleneckError("This job timed out after ".concat(next.options.expiration, " ms.")));
	          }, wait + next.options.expiration) : void 0,
	          job: next
	        };
	      }
	    }, {
	      key: "_drainOne",
	      value: function _drainOne(capacity) {
	        var _this3 = this;

	        return this._registerLock.schedule(function () {
	          var args, index, next, options, queue;

	          if (_this3.queued() === 0) {
	            return _this3.Promise.resolve(false);
	          }

	          queue = _this3._queues.getFirst();

	          var _next = next = queue.first();

	          options = _next.options;
	          args = _next.args;

	          if (capacity != null && options.weight > capacity) {
	            return _this3.Promise.resolve(false);
	          }

	          _this3.Events.trigger("debug", ["Draining ".concat(options.id), {
	            args: args,
	            options: options
	          }]);

	          index = _this3._randomIndex();
	          return _this3._store.__register__(index, options.weight, options.expiration).then(function (_ref3) {
	            var success = _ref3.success,
	                wait = _ref3.wait,
	                reservoir = _ref3.reservoir;
	            var empty;

	            _this3.Events.trigger("debug", ["Drained ".concat(options.id), {
	              success: success,
	              args: args,
	              options: options
	            }]);

	            if (success) {
	              queue.shift();
	              empty = _this3.empty();

	              if (empty) {
	                _this3.Events.trigger("empty", []);
	              }

	              if (reservoir === 0) {
	                _this3.Events.trigger("depleted", [empty]);
	              }

	              _this3._run(next, wait, index);
	            }

	            return _this3.Promise.resolve(success);
	          });
	        });
	      }
	    }, {
	      key: "_drainAll",
	      value: function _drainAll(capacity) {
	        var _this4 = this;

	        return this._drainOne(capacity).then(function (success) {
	          if (success) {
	            return _this4._drainAll();
	          } else {
	            return _this4.Promise.resolve(success);
	          }
	        }).catch(function (e) {
	          return _this4.Events.trigger("error", [e]);
	        });
	      }
	    }, {
	      key: "_drop",
	      value: function _drop(job) {
	        var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "This job has been dropped by Bottleneck";
	        var ref;

	        if (this._states.remove(job.options.id)) {
	          if (this.rejectOnDrop) {
	            if ((ref = job.cb) != null) {
	              ref.apply({}, [new Bottleneck.prototype.BottleneckError(message)]);
	            }
	          }

	          return this.Events.trigger("dropped", [job]);
	        }
	      }
	    }, {
	      key: "_dropAllQueued",
	      value: function _dropAllQueued(message) {
	        var _this5 = this;

	        return this._queues.shiftAll(function (job) {
	          return _this5._drop(job, message);
	        });
	      }
	    }, {
	      key: "stop",
	      value: function stop() {
	        var _this6 = this;

	        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	        var done, waitForExecuting;
	        options = parser$7.load(options, this.stopDefaults);

	        waitForExecuting = function waitForExecuting(at) {
	          var finished;

	          finished = function finished() {
	            var counts;
	            counts = _this6._states.counts;
	            return counts[0] + counts[1] + counts[2] + counts[3] === at;
	          };

	          return new _this6.Promise(function (resolve, reject) {
	            if (finished()) {
	              return resolve();
	            } else {
	              return _this6.on("done", function () {
	                if (finished()) {
	                  _this6.removeAllListeners("done");

	                  return resolve();
	                }
	              });
	            }
	          });
	        };

	        done = options.dropWaitingJobs ? (this._run = function (next) {
	          return _this6._drop(next, options.dropErrorMessage);
	        }, this._drainOne = function () {
	          return _this6.Promise.resolve(false);
	        }, this._registerLock.schedule(function () {
	          return _this6._submitLock.schedule(function () {
	            var k, ref, v;
	            ref = _this6._scheduled;

	            for (k in ref) {
	              v = ref[k];

	              if (_this6.jobStatus(v.job.options.id) === "RUNNING") {
	                clearTimeout(v.timeout);
	                clearTimeout(v.expiration);

	                _this6._drop(v.job, options.dropErrorMessage);
	              }
	            }

	            _this6._dropAllQueued(options.dropErrorMessage);

	            return waitForExecuting(0);
	          });
	        })) : this.schedule({
	          priority: NUM_PRIORITIES - 1,
	          weight: 0
	        }, function () {
	          return waitForExecuting(1);
	        });

	        this.submit = function () {
	          var _ref4, _ref5, _splice$call, _splice$call2;

	          for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
	            args[_key3] = arguments[_key3];
	          }

	          var cb, ref;
	          ref = args, (_ref4 = ref, _ref5 = _toArray(_ref4), args = _ref5.slice(0), _ref4), (_splice$call = splice$1.call(args, -1), _splice$call2 = _slicedToArray(_splice$call, 1), cb = _splice$call2[0], _splice$call);
	          return cb != null ? cb.apply({}, [new Bottleneck.prototype.BottleneckError(options.enqueueErrorMessage)]) : void 0;
	        };

	        this.stop = function () {
	          return _this6.Promise.reject(new Bottleneck.prototype.BottleneckError("stop() has already been called"));
	        };

	        return done;
	      }
	    }, {
	      key: "submit",
	      value: function submit() {
	        var _this7 = this;

	        for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
	          args[_key4] = arguments[_key4];
	        }

	        var cb, job, options, ref, ref1, ref2, task;

	        if (typeof args[0] === "function") {
	          var _ref6, _ref7, _splice$call3, _splice$call4;

	          ref = args, (_ref6 = ref, _ref7 = _toArray(_ref6), task = _ref7[0], args = _ref7.slice(1), _ref6), (_splice$call3 = splice$1.call(args, -1), _splice$call4 = _slicedToArray(_splice$call3, 1), cb = _splice$call4[0], _splice$call3);
	          options = parser$7.load({}, this.jobDefaults, {});
	        } else {
	          var _ref8, _ref9, _splice$call5, _splice$call6;

	          ref1 = args, (_ref8 = ref1, _ref9 = _toArray(_ref8), options = _ref9[0], task = _ref9[1], args = _ref9.slice(2), _ref8), (_splice$call5 = splice$1.call(args, -1), _splice$call6 = _slicedToArray(_splice$call5, 1), cb = _splice$call6[0], _splice$call5);
	          options = parser$7.load(options, this.jobDefaults);
	        }

	        job = {
	          options: options,
	          task: task,
	          args: args,
	          cb: cb
	        };
	        options.priority = this._sanitizePriority(options.priority);

	        if (options.id === this.jobDefaults.id) {
	          options.id = "".concat(options.id, "-").concat(this._randomIndex());
	        }

	        if (this.jobStatus(options.id) != null) {
	          if ((ref2 = job.cb) != null) {
	            ref2.apply({}, [new Bottleneck.prototype.BottleneckError("A job with the same id already exists (id=".concat(options.id, ")"))]);
	          }

	          return false;
	        }

	        this._states.start(options.id); // RECEIVED


	        this.Events.trigger("debug", ["Queueing ".concat(options.id), {
	          args: args,
	          options: options
	        }]);
	        return this._submitLock.schedule(
	        /*#__PURE__*/
	        _asyncToGenerator(
	        /*#__PURE__*/
	        regeneratorRuntime.mark(function _callee2() {
	          var blocked, e, reachedHWM, ref3, shifted, strategy, _ref11;

	          return regeneratorRuntime.wrap(function _callee2$(_context2) {
	            while (1) {
	              switch (_context2.prev = _context2.next) {
	                case 0:
	                  _context2.prev = 0;
	                  _context2.next = 3;
	                  return _this7._store.__submit__(_this7.queued(), options.weight);

	                case 3:
	                  _ref11 = _context2.sent;
	                  reachedHWM = _ref11.reachedHWM;
	                  blocked = _ref11.blocked;
	                  strategy = _ref11.strategy;

	                  _this7.Events.trigger("debug", ["Queued ".concat(options.id), {
	                    args: args,
	                    options: options,
	                    reachedHWM: reachedHWM,
	                    blocked: blocked
	                  }]);

	                  _context2.next = 17;
	                  break;

	                case 10:
	                  _context2.prev = 10;
	                  _context2.t0 = _context2["catch"](0);
	                  e = _context2.t0;

	                  _this7._states.remove(options.id);

	                  _this7.Events.trigger("debug", ["Could not queue ".concat(options.id), {
	                    args: args,
	                    options: options,
	                    error: e
	                  }]);

	                  if ((ref3 = job.cb) != null) {
	                    ref3.apply({}, [e]);
	                  }

	                  return _context2.abrupt("return", false);

	                case 17:
	                  if (!blocked) {
	                    _context2.next = 22;
	                    break;
	                  }

	                  _this7._drop(job);

	                  return _context2.abrupt("return", true);

	                case 22:
	                  if (!reachedHWM) {
	                    _context2.next = 28;
	                    break;
	                  }

	                  shifted = strategy === Bottleneck.prototype.strategy.LEAK ? _this7._queues.shiftLastFrom(options.priority) : strategy === Bottleneck.prototype.strategy.OVERFLOW_PRIORITY ? _this7._queues.shiftLastFrom(options.priority + 1) : strategy === Bottleneck.prototype.strategy.OVERFLOW ? job : void 0;

	                  if (shifted != null) {
	                    _this7._drop(shifted);
	                  }

	                  if (!(shifted == null || strategy === Bottleneck.prototype.strategy.OVERFLOW)) {
	                    _context2.next = 28;
	                    break;
	                  }

	                  if (shifted == null) {
	                    _this7._drop(job);
	                  }

	                  return _context2.abrupt("return", reachedHWM);

	                case 28:
	                  _this7._states.next(job.options.id); // QUEUED


	                  _this7._queues.push(options.priority, job);

	                  _context2.next = 32;
	                  return _this7._drainAll();

	                case 32:
	                  return _context2.abrupt("return", reachedHWM);

	                case 33:
	                case "end":
	                  return _context2.stop();
	              }
	            }
	          }, _callee2, this, [[0, 10]]);
	        })));
	      }
	    }, {
	      key: "schedule",
	      value: function schedule() {
	        var _this8 = this;

	        for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
	          args[_key5] = arguments[_key5];
	        }

	        var options, task, wrapped;

	        if (typeof args[0] === "function") {
	          var _args3 = args;

	          var _args4 = _toArray(_args3);

	          task = _args4[0];
	          args = _args4.slice(1);
	          options = parser$7.load({}, this.jobDefaults, {});
	        } else {
	          var _args5 = args;

	          var _args6 = _toArray(_args5);

	          options = _args6[0];
	          task = _args6[1];
	          args = _args6.slice(2);
	          options = parser$7.load(options, this.jobDefaults);
	        }

	        wrapped = function wrapped() {
	          var _ref12, _ref13, _splice$call7, _splice$call8;

	          for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
	            args[_key6] = arguments[_key6];
	          }

	          var cb, ref, returned;
	          ref = args, (_ref12 = ref, _ref13 = _toArray(_ref12), args = _ref13.slice(0), _ref12), (_splice$call7 = splice$1.call(args, -1), _splice$call8 = _slicedToArray(_splice$call7, 1), cb = _splice$call8[0], _splice$call7);
	          returned = task.apply({}, args);
	          return (!((returned != null ? returned.then : void 0) != null && typeof returned.then === "function") ? _this8.Promise.resolve(returned) : returned).then(function () {
	            for (var _len7 = arguments.length, args = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
	              args[_key7] = arguments[_key7];
	            }

	            return cb.apply({}, Array.prototype.concat(null, args));
	          }).catch(function () {
	            for (var _len8 = arguments.length, args = new Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
	              args[_key8] = arguments[_key8];
	            }

	            return cb.apply({}, args);
	          });
	        };

	        return new this.Promise(function (resolve, reject) {
	          return _this8.submit.apply({}, Array.prototype.concat(options, wrapped, args, function () {
	            for (var _len9 = arguments.length, args = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
	              args[_key9] = arguments[_key9];
	            }

	            return (args[0] != null ? reject : (args.shift(), resolve)).apply({}, args);
	          })).catch(function (e) {
	            return _this8.Events.trigger("error", [e]);
	          });
	        });
	      }
	    }, {
	      key: "wrap",
	      value: function wrap(fn) {
	        var _this9 = this;

	        var wrapped;

	        wrapped = function wrapped() {
	          for (var _len10 = arguments.length, args = new Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
	            args[_key10] = arguments[_key10];
	          }

	          return _this9.schedule.apply({}, Array.prototype.concat(fn, args));
	        };

	        wrapped.withOptions = function (options) {
	          for (var _len11 = arguments.length, args = new Array(_len11 > 1 ? _len11 - 1 : 0), _key11 = 1; _key11 < _len11; _key11++) {
	            args[_key11 - 1] = arguments[_key11];
	          }

	          return _this9.schedule.apply({}, Array.prototype.concat(options, fn, args));
	        };

	        return wrapped;
	      }
	    }, {
	      key: "updateSettings",
	      value: function () {
	        var _updateSettings = _asyncToGenerator(
	        /*#__PURE__*/
	        regeneratorRuntime.mark(function _callee3() {
	          var options,
	              _args7 = arguments;
	          return regeneratorRuntime.wrap(function _callee3$(_context3) {
	            while (1) {
	              switch (_context3.prev = _context3.next) {
	                case 0:
	                  options = _args7.length > 0 && _args7[0] !== undefined ? _args7[0] : {};
	                  _context3.next = 3;
	                  return this._store.__updateSettings__(parser$7.overwrite(options, this.storeDefaults));

	                case 3:
	                  parser$7.overwrite(options, this.instanceDefaults, this);
	                  return _context3.abrupt("return", this);

	                case 5:
	                case "end":
	                  return _context3.stop();
	              }
	            }
	          }, _callee3, this);
	        }));

	        return function updateSettings() {
	          return _updateSettings.apply(this, arguments);
	        };
	      }()
	    }, {
	      key: "currentReservoir",
	      value: function currentReservoir() {
	        return this._store.__currentReservoir__();
	      }
	    }, {
	      key: "incrementReservoir",
	      value: function incrementReservoir() {
	        var incr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
	        return this._store.__incrementReservoir__(incr);
	      }
	    }]);

	    return Bottleneck;
	  }();
	  Bottleneck.default = Bottleneck;
	  Bottleneck.version = Bottleneck.prototype.version = packagejson.version;
	  Bottleneck.strategy = Bottleneck.prototype.strategy = {
	    LEAK: 1,
	    OVERFLOW: 2,
	    OVERFLOW_PRIORITY: 4,
	    BLOCK: 3
	  };
	  Bottleneck.BottleneckError = Bottleneck.prototype.BottleneckError = BottleneckError_1;
	  Bottleneck.Group = Bottleneck.prototype.Group = Group_1;
	  Bottleneck.RedisConnection = Bottleneck.prototype.RedisConnection = RedisConnection_1;
	  Bottleneck.IORedisConnection = Bottleneck.prototype.IORedisConnection = IORedisConnection_1;
	  Bottleneck.Batcher = Bottleneck.prototype.Batcher = Batcher_1;
	  Bottleneck.prototype.jobDefaults = {
	    priority: DEFAULT_PRIORITY,
	    weight: 1,
	    expiration: null,
	    id: "<no-id>"
	  };
	  Bottleneck.prototype.storeDefaults = {
	    maxConcurrent: null,
	    minTime: 0,
	    highWater: null,
	    strategy: Bottleneck.prototype.strategy.LEAK,
	    penalty: null,
	    reservoir: null,
	    reservoirRefreshInterval: null,
	    reservoirRefreshAmount: null
	  };
	  Bottleneck.prototype.localStoreDefaults = {
	    Promise: Promise,
	    timeout: null,
	    heartbeatInterval: 250
	  };
	  Bottleneck.prototype.redisStoreDefaults = {
	    Promise: Promise,
	    timeout: null,
	    heartbeatInterval: 5000,
	    clientOptions: {},
	    clusterNodes: null,
	    clearDatastore: false,
	    connection: null
	  };
	  Bottleneck.prototype.instanceDefaults = {
	    datastore: "local",
	    connection: null,
	    id: "<no-id>",
	    rejectOnDrop: true,
	    trackDoneStatus: false,
	    Promise: Promise
	  };
	  Bottleneck.prototype.stopDefaults = {
	    enqueueErrorMessage: "This limiter has been stopped and cannot accept new jobs.",
	    dropWaitingJobs: true,
	    dropErrorMessage: "This limiter has been stopped."
	  };
	  return Bottleneck;
	}.call(commonjsGlobal);

	var Bottleneck_1 = Bottleneck;

	var bundle = Bottleneck_1;

	return bundle;

})));
