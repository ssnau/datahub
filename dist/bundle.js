(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib');

},{"./lib":2}],2:[function(require,module,exports){
var keys = require('object-keys');
var each = require('util-each');

// es5 shims
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

},{"./util":3,"object-keys":4,"util-each":6}],3:[function(require,module,exports){
var polyfills = {
  indexOf: [].indexOf || function(elt /*, from*/)
  {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
},
filter:  [].filter || function(fun /*, thisp */) {"use strict";

        if (this == null)
            throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if ( typeof fun != "function")
            throw new TypeError();

        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if ( i in t) {
                var val = t[i];
                // in case fun mutates this
                if (fun.call(thisp, val, i, t))
                    res.push(val);
            }
        }

        return res;
      },
map: [].map || function(callback, thisArg) {

        var T, A, k;

        if (this == null) {
            throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if ( typeof callback !== "function") {
            throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
            T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) where Array is
        // the standard built-in constructor with that name and len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while (k < len) {

            var kValue, mappedValue;

            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            if ( k in O) {

                // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
                kValue = O[k];

                // ii. Let mappedValue be the result of calling the Call internal method of callback
                // with T as the this value and argument list containing kValue, k, and O.
                mappedValue = callback.call(T, kValue, k, O);

                // iii. Call the DefineOwnProperty internal method of A with arguments
                // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
                // and false.

                // In browsers that support Object.defineProperty, use the following:
                // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

                // For best browser support, use the following:
                A[k] = mappedValue;
            }
            // d. Increase k by 1.
            k++;
        }

        // 9. return A
        return A;
    }  
};

function wrap(name) {
  return function(array) {
    return polyfills[name].apply(array, [].slice.call(arguments, 1));
  }
}

var indexOf = wrap('indexOf');
var filter = wrap('filter');
var map = wrap('map');
module.exports = {
  indexOf: indexOf,
  filter: filter,
  map: map,
  exclude: function(array, subarray) {
    return filter(array, function(item) {
      return indexOf(subarray, item) === -1;
    });
  }
};

},{}],4:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var isArgs = require('./isArguments');
var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var ctor = object.constructor;
		var skipConstructor = ctor && ctor.prototype === object;

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (!Object.keys) {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":5}],5:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],6:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;

/**
 * Iterate over any object, calling the callback function on every iteration.
 *
 * @param {Object}   obj
 * @param {Function} fn
 * @param {*}        context
 */
module.exports = function (obj, fn, context) {
  // Iterate over array-like objects numerically.
  if (obj != null && obj.length === +obj.length) {
    for (var i = 0; i < obj.length; i++) {
      fn.call(context, obj[i], i, obj);
    }
  } else {
    for (var key in obj) {
      // Use the Object prototype directly in case the object we are iterating
      // over does not inherit from `Object.prototype`.
      if (hasOwn.call(obj, key)) {
        fn.call(context, obj[key], key, obj);
      }
    }
  }
};

},{}]},{},[1]);
