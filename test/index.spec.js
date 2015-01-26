var Hub = require('../');
console.log(Hub);
var assert = require('assert');
var sinon = require('sinon');
var count = 1;

var next = function (func) {
  setTimeout(function(){
      func();
  }, 10);
}

describe('get instances', function () {
  it('should get same instance', function() {
    var data1 = Hub.getInstance();
    var data2 = Hub.getInstance();
    assert.equal(data1, data2);
  });

  it('should get the same instance', function() {
    var hub1 = Hub.getInstance('jack');
    var hub2 = Hub.getInstance('jack');
    assert.equal(hub1, hub2);
  });

  it('should get null if we set onlyGet as true', function () {
    var hub1 = Hub.getInstance('x', true);
    assert.equal(hub1, null);
  });

});

describe('should work with event', function(){
  var hub;
  beforeEach(function() {
    count++;
    hub = Hub.getInstance(count);
  });

  it('should listen to event', function (done){
    var callback = sinon.spy();
    hub.on('hello', callback);

    hub.set('hello', 1);

    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('should listen to anything', function (done) {
    var callback = sinon.spy();
    hub.on(callback);
    hub.set('afasef', 1);

    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('can set before listen #1', function (done) {
    hub.set('abc', 100);
    var callback = sinon.spy();
    hub.on('abc', callback);
    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('can set before listen and it will invoke immediately', function (done) {
    hub.set('abcd', 100);
    hub.set('ava', 900);
    var callback = sinon.spy();
    next(function(){
      hub.on('abcd', function (val) {
        assert(val, 100);
        hub.on('ava', callback);
        next(function() {
          assert.equal(callback.calledOnce, true);
          done();
        });
      });
    }, 30);
  });

  it('should only call once no matter how you change it', function (done) {
    var callback = sinon.spy();
    hub.on('special', function(){
      callback(); 
    });
    hub.set('special', 1);
    hub.set('special', 2);
    hub.set('special', 3);

    next(function() {
      assert.equal(callback.calledOnce, true);
      done();
    });

  });

  it('should call with combined event', function (done) {
    var callback = sinon.spy();
    hub.on(['hello', 'world', 'body'], callback);
    hub.set('hello', 1);
    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('should call only once with combined event', function (done) {
    var callback = sinon.spy();
    hub.on(['hello', 'world', 'body'], callback);
    hub.set('hello', 1);
    hub.set('world', 3);
    hub.set('body', 6);
    next(function (){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('should not call if not change the value', function (done) {
    hub._data.name = 'jack';
    var callback = sinon.spy();
    hub.on('name', callback);
    hub.set('name', 'jack');
    next(function(){
      assert.equal(callback.notCalled, true);
      done();
    });
  });

});

describe('should work with mutiple listeners', function (done) {
  var hub, callback1, callback2;
  beforeEach(function() {
    count++;
    hub = Hub.getInstance(count);
    callback1 = sinon.spy();
    callback2 = sinon.spy();
    hub.on(['a', 'y', 'z'], callback1);
    hub.on(['x', 'y', 'z'], callback2);
  });

  it('simple case 1',  function(done) {
    hub.set('y', 1);

    next(function () {
      assert.equal(callback1.calledOnce, true);
      assert.equal(callback2.calledOnce, true);
      done();
    });
  });

  it('simple case 2',  function(done){
    hub.set('a', 1);

    next(function () {
      assert.equal(callback1.calledOnce, true);
      assert.equal(callback2.notCalled, true);
      done();
    });
  });

  it('get arguments', function (done) {
    hub.set('x', 1);
    hub.set('y', 3);
    hub.set('z', 9);

    hub.on(['x', 'y', 'z'], function(x, y, z) {
      assert.equal(x, 1);
      assert.equal(y, 3);
      assert.equal(z, 9);
      done();
    });
  });

});

describe('getter and setter', function() {
  var hub;
  beforeEach(function(done) {
    count++;
    hub = Hub.getInstance(count);
    hub.set('name', 'jack');
    next(done);
  });

  it('should not get dirty value', function(done){
    hub.set('name', 'john');
    assert.notEqual(hub.get('name'), 'john');
    assert.equal(hub.get('name'), 'jack');

    // only after digest can you get the setted value
    next(function(){
      assert.equal(hub.get('name'), 'john');
      done();
    });
  });

  it('should get the setted value via next', function(done){
    hub.set('name', 'air');

    hub.next(function(){
      assert.equal(hub.get('name'), 'air');
      done();
    });

  });
});

describe('test with object', function (done) {
  var hub;
  beforeEach(function() {
    count++;
    hub = Hub.getInstance(count);
  });

  it('should called set object with update value', function(done) {
    var callback = sinon.spy();
    hub._data['person'] = {name: 'jack'};
    hub.on('person', callback);

    var person = hub.get('person');
    person.name = 'john';
    hub.set('person', person);
    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });
  });

  it('should not called after set object with non-update value', function(done) {
    var callback = sinon.spy();
    hub._data['person'] = {name: 'jack'};
    hub.on('person', callback);

    var person = hub.get('person');
    hub.set('person', person);
    next(function(){
      assert.equal(callback.notCalled, true);
      done();
    });
  });

  it('should called with changed array', function (done) {
    var callback = sinon.spy();
    hub._data['cards'] = [1,2,3];
    hub.on('cards', callback);

    var cards = hub.get('cards');
    cards[0] = 5;
    hub.set('cards', cards);

    next(function(){
      assert.equal(callback.calledOnce, true);
      done();
    });

  });

  it('should not called with unchanged array', function (done) {
    var callback = sinon.spy();
    hub._data['cards'] = [1,2,3];
    hub.on('cards', callback);

    var cards = hub.get('cards');
    cards.push('x');
    cards.pop();

    next(function(){
      assert.equal(callback.notCalled, true);
      done();
    });

  });

});


describe('watch function', function(){

  var hub;
  beforeEach(function() {
    count++;
    hub = Hub.getInstance(count);
  });

  it('should watch the change', function(done){
    var res = 0;
    hub.watch('hello + world', function(val) {
      res = val;
    });
    hub.set('hello', 3);
    hub.set('world', 10);
    next(function(){
      assert.equal(res, 13);
      done();
    });
  });

});
