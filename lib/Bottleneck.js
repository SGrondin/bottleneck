"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Bottleneck,
    DEFAULT_PRIORITY,
    Events,
    LocalDatastore,
    NUM_PRIORITIES,
    Queues,
    RedisDatastore,
    States,
    Sync,
    parser,
    splice = [].splice;
NUM_PRIORITIES = 10;
DEFAULT_PRIORITY = 5;
parser = require("./parser");
Queues = require("./Queues");
LocalDatastore = require("./LocalDatastore");
RedisDatastore = require("./RedisDatastore");
Events = require("./Events");
States = require("./States");
Sync = require("./Sync");

Bottleneck = function () {
  class Bottleneck {
    constructor(options = {}, ...invalid) {
      var storeInstanceOptions, storeOptions;
      this._drainOne = this._drainOne.bind(this);
      this.submit = this.submit.bind(this);
      this.schedule = this.schedule.bind(this);
      this.updateSettings = this.updateSettings.bind(this);
      this.incrementReservoir = this.incrementReservoir.bind(this);

      this._validateOptions(options, invalid);

      parser.load(options, this.instanceDefaults, this);
      this._queues = new Queues(NUM_PRIORITIES);
      this._scheduled = {};
      this._states = new States(["RECEIVED", "QUEUED", "RUNNING", "EXECUTING"].concat(this.trackDoneStatus ? ["DONE"] : []));
      this._limiter = null;
      this.Events = new Events(this);
      this._submitLock = new Sync("submit", this.Promise);
      this._registerLock = new Sync("register", this.Promise);
      storeOptions = parser.load(options, this.storeDefaults, {});

      this._store = function () {
        if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
          storeInstanceOptions = parser.load(options, this.redisStoreDefaults, {});
          return new RedisDatastore(this, storeOptions, storeInstanceOptions);
        } else if (this.datastore === "local") {
          storeInstanceOptions = parser.load(options, this.localStoreDefaults, {});
          return new LocalDatastore(this, storeOptions, storeInstanceOptions);
        } else {
          throw new Bottleneck.prototype.BottleneckError(`Invalid datastore type: ${this.datastore}`);
        }
      }.call(this);

      this._queues.on("leftzero", () => {
        var base;
        return typeof (base = this._store.heartbeat).ref === "function" ? base.ref() : void 0;
      });

      this._queues.on("zero", () => {
        var base;
        return typeof (base = this._store.heartbeat).unref === "function" ? base.unref() : void 0;
      });
    }

    _validateOptions(options, invalid) {
      if (!(options != null && typeof options === "object" && invalid.length === 0)) {
        throw new Bottleneck.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
      }
    }

    ready() {
      return this._store.ready;
    }

    clients() {
      return this._store.clients;
    }

    channel() {
      return `b_${this.id}`;
    }

    channel_client() {
      return `b_${this.id}_${this._store.clientId}`;
    }

    publish(message) {
      return this._store.__publish__(message);
    }

    disconnect(flush = true) {
      return this._store.__disconnect__(flush);
    }

    chain(_limiter) {
      this._limiter = _limiter;
      return this;
    }

    queued(priority) {
      return this._queues.queued(priority);
    }

    clusterQueued() {
      return this._store.__queued__();
    }

    empty() {
      return this.queued() === 0 && this._submitLock.isEmpty();
    }

    running() {
      return this._store.__running__();
    }

    done() {
      return this._store.__done__();
    }

    jobStatus(id) {
      return this._states.jobStatus(id);
    }

    jobs(status) {
      return this._states.statusJobs(status);
    }

    counts() {
      return this._states.statusCounts();
    }

    _sanitizePriority(priority) {
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

    _randomIndex() {
      return Math.random().toString(36).slice(2);
    }

    check(weight = 1) {
      return this._store.__check__(weight);
    }

    _run(next, wait, index, retryCount) {
      var _this = this;

      var completed, done;
      this.Events.trigger("debug", `Scheduling ${next.options.id}`, {
        args: next.args,
        options: next.options
      });
      done = false;

      completed =
      /*#__PURE__*/
      function () {
        var _ref = _asyncToGenerator(function* (...args) {
          var e, error, eventInfo, retry, retryAfter, running;

          if (!done) {
            try {
              done = true;
              clearTimeout(_this._scheduled[index].expiration);
              delete _this._scheduled[index];
              eventInfo = {
                args: next.args,
                options: next.options,
                retryCount
              };

              if ((error = args[0]) != null) {
                retry = yield _this.Events.trigger("failed", error, eventInfo);

                if (retry != null) {
                  retryAfter = ~~retry;

                  _this.Events.trigger("retry", `Retrying ${next.options.id} after ${retryAfter} ms`, eventInfo);

                  return _this._run(next, retryAfter, index, retryCount + 1);
                }
              }

              _this._states.next(next.options.id); // DONE


              _this.Events.trigger("debug", `Completed ${next.options.id}`, eventInfo);

              _this.Events.trigger("done", `Completed ${next.options.id}`, eventInfo);

              var _ref2 = yield _this._store.__free__(index, next.options.weight);

              running = _ref2.running;

              _this.Events.trigger("debug", `Freed ${next.options.id}`, eventInfo);

              if (running === 0 && _this.empty()) {
                _this.Events.trigger("idle");
              }

              return typeof next.cb === "function" ? next.cb(...args) : void 0;
            } catch (error1) {
              e = error1;
              return _this.Events.trigger("error", e);
            }
          }
        });

        return function completed() {
          return _ref.apply(this, arguments);
        };
      }();

      if (retryCount === 0) {
        // RUNNING
        this._states.next(next.options.id);
      }

      return this._scheduled[index] = {
        timeout: setTimeout(() => {
          this.Events.trigger("debug", `Executing ${next.options.id}`, {
            args: next.args,
            options: next.options
          });

          if (retryCount === 0) {
            // EXECUTING
            this._states.next(next.options.id);
          }

          if (this._limiter != null) {
            return this._limiter.submit(next.options, next.task, ...next.args, completed);
          } else {
            return next.task(...next.args, completed);
          }
        }, wait),
        expiration: next.options.expiration != null ? setTimeout(() => {
          return completed(new Bottleneck.prototype.BottleneckError(`This job timed out after ${next.options.expiration} ms.`));
        }, wait + next.options.expiration) : void 0,
        job: next
      };
    }

    _drainOne(capacity) {
      return this._registerLock.schedule(() => {
        var args, index, next, options, queue;

        if (this.queued() === 0) {
          return this.Promise.resolve(null);
        }

        queue = this._queues.getFirst();

        var _next2 = next = queue.first();

        options = _next2.options;
        args = _next2.args;

        if (capacity != null && options.weight > capacity) {
          return this.Promise.resolve(null);
        }

        this.Events.trigger("debug", `Draining ${options.id}`, {
          args,
          options
        });
        index = this._randomIndex();
        return this._store.__register__(index, options.weight, options.expiration).then(({
          success,
          wait,
          reservoir
        }) => {
          var empty;
          this.Events.trigger("debug", `Drained ${options.id}`, {
            success,
            args,
            options
          });

          if (success) {
            queue.shift();
            empty = this.empty();

            if (empty) {
              this.Events.trigger("empty");
            }

            if (reservoir === 0) {
              this.Events.trigger("depleted", empty);
            }

            this._run(next, wait, index, 0);

            return this.Promise.resolve(options.weight);
          } else {
            return this.Promise.resolve(null);
          }
        });
      });
    }

    _drainAll(capacity, total = 0) {
      return this._drainOne(capacity).then(drained => {
        var newCapacity;

        if (drained != null) {
          newCapacity = capacity != null ? capacity - drained : capacity;
          return this._drainAll(newCapacity, total + drained);
        } else {
          return this.Promise.resolve(total);
        }
      }).catch(e => {
        return this.Events.trigger("error", e);
      });
    }

    _drop(job, message = "This job has been dropped by Bottleneck") {
      if (this._states.remove(job.options.id)) {
        if (this.rejectOnDrop) {
          if (typeof job.cb === "function") {
            job.cb(new Bottleneck.prototype.BottleneckError(message));
          }
        }

        return this.Events.trigger("dropped", job);
      }
    }

    _dropAllQueued(message) {
      return this._queues.shiftAll(job => {
        return this._drop(job, message);
      });
    }

    stop(options = {}) {
      var done, waitForExecuting;
      options = parser.load(options, this.stopDefaults);

      waitForExecuting = at => {
        var finished;

        finished = () => {
          var counts;
          counts = this._states.counts;
          return counts[0] + counts[1] + counts[2] + counts[3] === at;
        };

        return new this.Promise((resolve, reject) => {
          if (finished()) {
            return resolve();
          } else {
            return this.on("done", () => {
              if (finished()) {
                this.removeAllListeners("done");
                return resolve();
              }
            });
          }
        });
      };

      done = options.dropWaitingJobs ? (this._run = next => {
        return this._drop(next, options.dropErrorMessage);
      }, this._drainOne = () => {
        return this.Promise.resolve(null);
      }, this._registerLock.schedule(() => {
        return this._submitLock.schedule(() => {
          var k, ref, v;
          ref = this._scheduled;

          for (k in ref) {
            v = ref[k];

            if (this.jobStatus(v.job.options.id) === "RUNNING") {
              clearTimeout(v.timeout);
              clearTimeout(v.expiration);

              this._drop(v.job, options.dropErrorMessage);
            }
          }

          this._dropAllQueued(options.dropErrorMessage);

          return waitForExecuting(0);
        });
      })) : this.schedule({
        priority: NUM_PRIORITIES - 1,
        weight: 0
      }, () => {
        return waitForExecuting(1);
      });

      this.submit = (...args) => {
        var _ref3, _ref4, _splice$call, _splice$call2;

        var cb, ref;
        ref = args, (_ref3 = ref, _ref4 = _toArray(_ref3), args = _ref4.slice(0), _ref3), (_splice$call = splice.call(args, -1), _splice$call2 = _slicedToArray(_splice$call, 1), cb = _splice$call2[0], _splice$call);
        return typeof cb === "function" ? cb(new Bottleneck.prototype.BottleneckError(options.enqueueErrorMessage)) : void 0;
      };

      this.stop = () => {
        return this.Promise.reject(new Bottleneck.prototype.BottleneckError("stop() has already been called"));
      };

      return done;
    }

    submit(...args) {
      var _this2 = this;

      var cb, job, options, ref, ref1, task;

      if (typeof args[0] === "function") {
        var _ref5, _ref6, _splice$call3, _splice$call4;

        ref = args, (_ref5 = ref, _ref6 = _toArray(_ref5), task = _ref6[0], args = _ref6.slice(1), _ref5), (_splice$call3 = splice.call(args, -1), _splice$call4 = _slicedToArray(_splice$call3, 1), cb = _splice$call4[0], _splice$call3);
        options = parser.load({}, this.jobDefaults, {});
      } else {
        var _ref7, _ref8, _splice$call5, _splice$call6;

        ref1 = args, (_ref7 = ref1, _ref8 = _toArray(_ref7), options = _ref8[0], task = _ref8[1], args = _ref8.slice(2), _ref7), (_splice$call5 = splice.call(args, -1), _splice$call6 = _slicedToArray(_splice$call5, 1), cb = _splice$call6[0], _splice$call5);
        options = parser.load(options, this.jobDefaults);
      }

      job = {
        options,
        task,
        args,
        cb
      };
      options.priority = this._sanitizePriority(options.priority);

      if (options.id === this.jobDefaults.id) {
        options.id = `${options.id}-${this._randomIndex()}`;
      }

      if (this.jobStatus(options.id) != null) {
        if (typeof job.cb === "function") {
          job.cb(new Bottleneck.prototype.BottleneckError(`A job with the same id already exists (id=${options.id})`));
        }

        return false;
      }

      this._states.start(options.id); // RECEIVED


      this.Events.trigger("debug", `Queueing ${options.id}`, {
        args,
        options
      });
      return this._submitLock.schedule(
      /*#__PURE__*/
      _asyncToGenerator(function* () {
        var blocked, e, reachedHWM, shifted, strategy;

        try {
          var _ref10 = yield _this2._store.__submit__(_this2.queued(), options.weight);

          reachedHWM = _ref10.reachedHWM;
          blocked = _ref10.blocked;
          strategy = _ref10.strategy;

          _this2.Events.trigger("debug", `Queued ${options.id}`, {
            args,
            options,
            reachedHWM,
            blocked
          });
        } catch (error1) {
          e = error1;

          _this2._states.remove(options.id);

          _this2.Events.trigger("debug", `Could not queue ${options.id}`, {
            args,
            options,
            error: e
          });

          if (typeof job.cb === "function") {
            job.cb(e);
          }

          return false;
        }

        if (blocked) {
          _this2._drop(job);

          return true;
        } else if (reachedHWM) {
          shifted = strategy === Bottleneck.prototype.strategy.LEAK ? _this2._queues.shiftLastFrom(options.priority) : strategy === Bottleneck.prototype.strategy.OVERFLOW_PRIORITY ? _this2._queues.shiftLastFrom(options.priority + 1) : strategy === Bottleneck.prototype.strategy.OVERFLOW ? job : void 0;

          if (shifted != null) {
            _this2._drop(shifted);
          }

          if (shifted == null || strategy === Bottleneck.prototype.strategy.OVERFLOW) {
            if (shifted == null) {
              _this2._drop(job);
            }

            return reachedHWM;
          }
        }

        _this2._states.next(job.options.id); // QUEUED


        _this2._queues.push(options.priority, job);

        yield _this2._drainAll();
        return reachedHWM;
      }));
    }

    schedule(...args) {
      var options, task, wrapped;

      if (typeof args[0] === "function") {
        var _args = args;

        var _args2 = _toArray(_args);

        task = _args2[0];
        args = _args2.slice(1);
        options = parser.load({}, this.jobDefaults, {});
      } else {
        var _args3 = args;

        var _args4 = _toArray(_args3);

        options = _args4[0];
        task = _args4[1];
        args = _args4.slice(2);
        options = parser.load(options, this.jobDefaults);
      }

      wrapped = (...args) => {
        var _ref11, _ref12, _splice$call7, _splice$call8;

        var cb, e, ref, returned;
        ref = args, (_ref11 = ref, _ref12 = _toArray(_ref11), args = _ref12.slice(0), _ref11), (_splice$call7 = splice.call(args, -1), _splice$call8 = _slicedToArray(_splice$call7, 1), cb = _splice$call8[0], _splice$call7);

        returned = function () {
          try {
            return task(...args);
          } catch (error1) {
            e = error1;
            return this.Promise.reject(e);
          }
        }.call(this);

        return (!((returned != null ? returned.then : void 0) != null && typeof returned.then === "function") ? this.Promise.resolve(returned) : returned).then(function (...args) {
          return cb(null, ...args);
        }).catch(function (...args) {
          return cb(...args);
        });
      };

      return new this.Promise((resolve, reject) => {
        return this.submit(options, wrapped, ...args, function (...args) {
          return (args[0] != null ? reject : (args.shift(), resolve))(...args);
        }).catch(e => {
          return this.Events.trigger("error", e);
        });
      });
    }

    wrap(fn) {
      var schedule, wrapped;
      schedule = this.schedule;

      wrapped = function wrapped(...args) {
        return schedule(fn.bind(this), ...args);
      };

      wrapped.withOptions = (options, ...args) => {
        return schedule(options, fn, ...args);
      };

      return wrapped;
    }

    updateSettings(options = {}) {
      var _this3 = this;

      return _asyncToGenerator(function* () {
        yield _this3._store.__updateSettings__(parser.overwrite(options, _this3.storeDefaults));
        parser.overwrite(options, _this3.instanceDefaults, _this3);
        return _this3;
      })();
    }

    currentReservoir() {
      return this._store.__currentReservoir__();
    }

    incrementReservoir(incr = 0) {
      return this._store.__incrementReservoir__(incr);
    }

  }

  ;
  Bottleneck.default = Bottleneck;
  Bottleneck.Events = Events;
  Bottleneck.version = Bottleneck.prototype.version = require("./version.json").version;
  Bottleneck.strategy = Bottleneck.prototype.strategy = {
    LEAK: 1,
    OVERFLOW: 2,
    OVERFLOW_PRIORITY: 4,
    BLOCK: 3
  };
  Bottleneck.BottleneckError = Bottleneck.prototype.BottleneckError = require("./BottleneckError");
  Bottleneck.Group = Bottleneck.prototype.Group = require("./Group");
  Bottleneck.RedisConnection = Bottleneck.prototype.RedisConnection = require("./RedisConnection");
  Bottleneck.IORedisConnection = Bottleneck.prototype.IORedisConnection = require("./IORedisConnection");
  Bottleneck.Batcher = Bottleneck.prototype.Batcher = require("./Batcher");
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
    reservoirRefreshAmount: null,
    reservoirIncreaseInterval: null,
    reservoirIncreaseAmount: null,
    reservoirIncreaseMaximum: null
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
    clientTimeout: 10000,
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
}.call(void 0);

module.exports = Bottleneck;