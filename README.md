datahub
====

A tiny simple center datahub for traditional frontend project.

In many traditional javascript project, we use JQuery to fetch DOM Node to get data value and manipulate DOM directly to sync data change.

However, such code is unmaintainable. If several component affect each other and change the DOM of each other, nobody knows how to mantain it.

Thus, 'datahubjs' comes out.

Datahub suggests you to only manipulate data to make your application logic clearer and more easy to read. All you need to do is to listen&invoke data change by config each component.
And each component should totally unaware others' existance.


Data Flow
=====

```
 _______                               ______________               ------------ 
|       |  hub.set("any-prop", val)   |              |   _digest() |            |
| state |  -------------------------> |   trasient   | ----------->|   updated  |
|       |                             |     state    |             |    state   |
|_______|                             |______________|             |____________|
                                           ^      |                       | 
                                           |      |                       |   emit event
                                           |_ _ _ |                       V
                                    hub.set('any-prop', val)     |------------------|
                                                                 | update component |   
                                                                 |------------------| 
```

API
====

####set(propName, value)

Update a specified propName as the passed-in value.

*Notice*: the prop will update after a digest cycle, not update immediately.

####get(propName, value)

Get a specifed propName value;

###on(props, callback)

Listen to any number of prop changes. 
The callback will invoke after a digest cycle only if any listened props were changed
and arguments will be map to the listened props.

If props is not provided, the callback will register as a global callback. It means
the callback will be invoked after each digest.

```javascript
var hub = datahub.getInstance();
hub.on('hello', function(val) {
  console.log('hello is: ' + val);
});
hub.on(['hello', 'world'], function(hello, world) {
  console.log('composite: '+ hello + " , " world);
});
hub.set('hello', 1);
hub.set('world', 2)

=>

hello is: 1
composite: 1 , 2

```

###watch(expression, callback)

Listen to an expression and campare the newVal with the old value every digest cycle.
It will invoke the callback once detect the newVal is different with the oldVal.

```javascript

var hub = datahub.getInstance();
hub.watch('hello + world', function(val) {
  console.log(val);
});
hub.set('hello', 10);
hub.set('world', 3);

=>

output: 13

```


License
====
MIT
