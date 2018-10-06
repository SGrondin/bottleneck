"use strict";

(function () {
  var Batcher, Events, parser;

  parser = require("./parser");

  Events = require("./Events");

  Batcher = function () {
    class Batcher {
      constructor(options = {}) {
        var base;
        this.options = options;
        parser.load(this.options, this.defaults, this);
        this.Events = new Events(this);
        this._arr = [];
        this._resetPromise();
        this._lastFlush = Date.now();
        if (this.maxTime != null) {
          if (typeof (base = this.interval = setInterval(() => {
            if (Date.now() >= this._lastFlush + this.maxTime && this._arr.length > 0) {
              return this._flush();
            }
          }, Math.max(Math.floor(this.maxTime / 5), 25))).unref === "function") {
            base.unref();
          }
        }
      }

      _resetPromise() {
        var _promise$_resolve;

        var _promise, _resolve;
        _resolve = null;
        _promise = new this.Promise(function (res, rej) {
          return _resolve = res;
        });
        return _promise$_resolve = { _promise, _resolve }, this._promise = _promise$_resolve._promise, this._resolve = _promise$_resolve._resolve, _promise$_resolve;
      }

      _flush() {
        this._lastFlush = Date.now();
        this._resolve();
        this.Events.trigger("batch", [this._arr]);
        this._arr = [];
        return this._resetPromise();
      }

      add(data) {
        var ret;
        this._arr.push(data);
        ret = this._promise;
        if (this._arr.length === this.maxSize) {
          this._flush();
        }
        return ret;
      }

    };

    Batcher.prototype.defaults = {
      maxTime: null,
      maxSize: null,
      Promise: Promise
    };

    return Batcher;
  }.call(this);

  module.exports = Batcher;
}).call(undefined);