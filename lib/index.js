// es5 shims
var keys = require('object-keys');
var each = require('util-each');
var util = require('./util');
var indexOf = util.indexOf;
var filter = util.filter;
var map = util.map;
var exclude = util.exclude;

var DELIMITER = "__DATAHUB__DELEMITER__";
var INJECTOR = "__$$hubInjectors";
var ENABLE_LOG = true;

var instances = {};
var instanceCount = 0;

function isNully(val) {
  return val === void 0 || val === null || val === '';
}

function Hub(name) {
  this._nextData = {}; // changed data for next stage
  this._data = {}; // inner data storage
  this._listeners = {}; // listeners
  this._globalListeners = []; // global listeners will invoke no matter what has changed
  this._tempCallbacks = []; // temporary callback use for next stage
  this._invokedKeys = {}; // store invoked keys for lazy binding
  this.$name = name; // name of the Hub

  if (isNully(name)) {
    name = 'anomynous-hub-' + Hub._count;
    instanceCount++;
  }

  instances[name] = this;
}

Hub.getInstance = function(name, onlyGet) {
  var instance = instances[name];
  return instance ? instance : (onlyGet ? null: new Hub(name));
}

function log() {
  if (!ENABLE_LOG) return;
  if (typeof console !== void 0 && console.log) {
    console.log.apply(console, arguments);
  }
}

/**
 * use to restrict the function passed in.
 * only call once under current stack;
 */
function tick(func) {
  var handle = null;
  return function() {
    log('handle is:', handle && handle._idleStart);
    var context = this;
    var args = arguments;
    if (handle) return;
    handle = setTimeout(function(){
      handle = null;
      func.apply(context, args);
    }, 1);
  };
};

Hub.prototype = {
  constructor: Hub,
  _mapValues: function(keys) {
    var me = this;
    return map(keys, function(key) {
        return me._data[key];
    });
  },
  _set: function _set(name, value) {
     log('setting ' + name + ' with value ' + value);
     this._nextData[name] = value;
     this._digest();
  },
  _digest: tick(function _digest() {
    log('digesting');
    var me = this;
    var eventNames = keys(this._listeners);
    var listeners = this._listeners;
    var data = this._nextData;
    var callbacks = this._globalListeners.concat(this._tempCallbacks);

    // reset first, in case there are errors..
    this._nextData = {};
    this._tempCallbacks = [];

    each(data, function(val, key) {
      if (me._data[key] === val) {
        return;
      }
      me._data[key] = val;
      me._invokedKeys[key] = true; // deal with lazy binding

      var events = filter(eventNames, function(eventName) {
        return eventName.indexOf(DELIMITER + key + DELIMITER) !== -1;
      });

      //eventNames = without.apply(null, [eventNames].concat(events));
      eventNames = exclude(eventNames, events);

      callbacks = callbacks.concat(map(events, function(eventName){
        return listeners[eventName];
      }));
    });

    // emit
    each(callbacks, function(callback){
      log('calling callback');
      var injectors = callback[INJECTOR] || [];
      log('injectors:', injectors);
      callback.apply(null, me._mapValues(injectors));
    });

  }),
  set: function setter(name, value) {
    if (isNully(name)) {
      log('[warning] setting key is', name);
      return;
    }

    if (typeof name === "string") {
      this._set(name, value);
    }

    if (typeof name === "object") {
      var obj = name;
      var me = this;
      each(obj, function(val, key){
        me._set(key, val);
      });
    }
  },
  get: function getter(name) {
    return this._data[name];
  },
  on: function on(names, callback) {
    if (typeof names === 'string' || typeof names === 'number') {
      names = [names];
    }

    if (typeof names === 'function') {
      this._globalListeners.push(names);
      return;
    }

    callback[INJECTOR] = names;

    // For lazy binding
    var me = this;
    var setted = false;
    each(names, function (name) {
      if (me._invokedKeys[name] && !setted) {
        setted = true;
        callback.apply(null, me._mapValues(names));
      }
    });

    // register callback
    names = [''].concat(names).concat('');
    var eventName = names.join(DELIMITER);
    this._listeners[eventName] = callback;
  },
  next: function (callback) {
    this._tempCallbacks.push(callback);
  }
};

module.exports = Hub;
