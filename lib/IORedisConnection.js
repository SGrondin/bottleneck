"use strict";

(function () {
  var Events, IORedisConnection, Scripts, parser;

  parser = require("./parser");

  Events = require("./Events");

  Scripts = require("./Scripts");

  IORedisConnection = function () {
    class IORedisConnection {
      constructor(options) {
        var Redis;
        Redis = eval("require")("ioredis"); // Obfuscated or else Webpack/Angular will try to inline the optional ioredis module
        parser.load(options, this.defaults, this);
        if (this.Events == null) {
          this.Events = new Events(this);
        }
        if (this.clusterNodes != null) {
          this.client = new Redis.Cluster(this.clusterNodes, this.clientOptions);
          this.subClient = new Redis.Cluster(this.clusterNodes, this.clientOptions);
        } else {
          this.client = new Redis(this.clientOptions);
          this.subClient = new Redis(this.clientOptions);
        }
        this.pubsubs = {};
        this.ready = new this.Promise((resolve, reject) => {
          var count, done, errorListener;
          count = 0;
          errorListener = e => {
            return this.Events.trigger("error", [e]);
          };
          done = () => {
            if (++count === 2) {
              return resolve({
                client: this.client,
                subscriber: this.subClient
              });
            }
          };
          this.client.on("error", errorListener);
          this.client.once("ready", done);
          this.subClient.on("error", errorListener);
          this.subClient.once("ready", done);
          return this.subClient.on("message", (channel, message) => {
            var base;
            return typeof (base = this.pubsubs)[channel] === "function" ? base[channel](message) : void 0;
          });
        });
      }

      loadScripts() {
        return Scripts.names.forEach(name => {
          return this.client.defineCommand(name, {
            lua: Scripts.payload(name)
          });
        });
      }

      addLimiter(instance, pubsub) {
        return new instance.Promise((resolve, reject) => {
          return this.subClient.subscribe(instance._channel(), () => {
            this.pubsubs[instance._channel()] = pubsub;
            return resolve();
          });
        });
      }

      removeLimiter(instance) {
        return delete this.pubsubs[instance._channel()];
      }

      scriptArgs(name, id, args, cb) {
        var keys;
        keys = Scripts.keys(name, id);
        return [keys.length].concat(keys, args, cb);
      }

      scriptFn(name) {
        return this.client[name].bind(this.client);
      }

      disconnect(flush) {
        if (flush) {
          return this.Promise.all([this.client.quit(), this.subClient.quit()]);
        } else {
          this.client.disconnect();
          this.subClient.disconnect();
          return this.Promise.resolve();
        }
      }

    };

    IORedisConnection.prototype.defaults = {
      clientOptions: {},
      clusterNodes: null,
      Promise: Promise,
      Events: null
    };

    return IORedisConnection;
  }.call(this);

  module.exports = IORedisConnection;
}).call(undefined);