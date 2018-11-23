"use strict";

var BottleneckError, States;
BottleneckError = require("./BottleneckError");
States = class States {
  constructor(status1) {
    this.status = status1;
    this.jobs = {};
    this.counts = this.status.map(function () {
      return 0;
    });
  }

  next(id) {
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

  start(id) {
    var initial;
    initial = 0;
    this.jobs[id] = initial;
    return this.counts[initial]++;
  }

  remove(id) {
    var current;
    current = this.jobs[id];

    if (current != null) {
      this.counts[current]--;
      delete this.jobs[id];
    }

    return current != null;
  }

  jobStatus(id) {
    var ref;
    return (ref = this.status[this.jobs[id]]) != null ? ref : null;
  }

  statusJobs(status) {
    var k, pos, ref, results, v;

    if (status != null) {
      pos = this.status.indexOf(status);

      if (pos < 0) {
        throw new BottleneckError(`status must be one of ${this.status.join(', ')}`);
      }

      ref = this.jobs;
      results = [];

      for (k in ref) {
        v = ref[k];

        if (v === pos) {
          results.push(k);
        }
      }

      return results;
    } else {
      return Object.keys(this.jobs);
    }
  }

  statusCounts() {
    return this.counts.reduce((acc, v, i) => {
      acc[this.status[i]] = v;
      return acc;
    }, {});
  }

};
module.exports = States;