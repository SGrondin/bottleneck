"use strict";

var Job, parser;
parser = require("./parser");
Job = class Job {
  constructor(task, args, options, jobDefaults, Promise, NUM_PRIORITIES, DEFAULT_PRIORITY) {
    this.task = task;
    this.args = args;
    this.Promise = Promise;
    this.options = parser.load(options, jobDefaults);
    this.options.priority = this._sanitizePriority(this.options.priority);

    if (this.options.id === jobDefaults.id) {
      this.options.id = `${this.options.id}-${this._randomIndex()}`;
    }

    this.promise = new this.Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.retryCount = 0;
  }

  _sanitizePriority(priority, NUM_PRIORITIES, DEFAULT_PRIORITY) {
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

  execute(cb) {
    var e, returned;

    returned = function () {
      try {
        return this.task(...this.args);
      } catch (error) {
        e = error;
        return this.Promise.reject(e);
      }
    }.call(this);

    return (!((returned != null ? returned.then : void 0) != null && typeof returned.then === "function") ? this.Promise.resolve(returned) : returned).then(function (passed) {
      return cb(null, passed);
    }).catch(function (err) {
      return cb(err);
    });
  }

  done(err, passed) {
    if (err != null) {
      return this.reject(err);
    } else {
      return this.resolve(passed);
    }
  }

};
module.exports = Job;