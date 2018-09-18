parser = require "./parser"
Events = require "./Events"
Scripts = require "./Scripts"

class RedisConnection
  datastore: "redis"
  defaults:
    clientOptions: {}
    client: null
    Promise: Promise
    Events: null

  constructor: (options={}) ->
    Redis = eval("require")("redis") # Obfuscated or else Webpack/Angular will try to inline the optional redis module
    parser.load options, @defaults, @
    @Events ?= new Events @

    @client ?= Redis.createClient @clientOptions
    @subscriber = @client.duplicate()
    @limiters = {}
    @shas = {}

    @ready = Promise.all [@_setup(@client, false), @_setup(@subscriber, true)]
    .then => @_loadScripts()
    .then => { @client, @subscriber }

  _setup: (client, subscriber) ->
    new @Promise (resolve, reject) =>
      client.on "error", (e) => @Events.trigger "error", [e]
      if subscriber
        client.on "message", (channel, message) =>
          @limiters[channel]?._store.onMessage message
      if client.ready then resolve()
      else client.once "ready", resolve

  _loadScript: (name) ->
    new @Promise (resolve, reject) =>
      payload = Scripts.payload name
      @client.multi([["script", "load", payload]]).exec (err, replies) =>
        if err? then return reject err
        @shas[name] = replies[0]
        resolve replies[0]

  _loadScripts: -> @Promise.all(Scripts.names.map (k) => @_loadScript k)

  addLimiter: (instance) ->
    new @Promise (resolve, reject) =>
      handler = (channel) =>
        if channel == instance._channel()
          @subscriber.removeListener "subscribe", handler
          @limiters[channel] = instance
          resolve()
      @subscriber.on "subscribe", handler
      @subscriber.subscribe instance._channel()

  removeLimiter: (instance) ->
    delete @limiters[instance._channel()]

  scriptArgs: (name, id, args, cb) ->
    keys = Scripts.keys name, id
    [@shas[name], keys.length].concat keys, args, cb

  scriptFn: (name) ->
    @client.evalsha.bind(@client)

  disconnect: (flush) ->
    @limiters[k]._store.__disconnect__(flush) for k in Object.keys @limiters
    @client.end flush
    @subscriber.end flush
    @Promise.resolve()

module.exports = RedisConnection
