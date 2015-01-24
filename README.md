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
|-------|  hub.set("any-prop", val)   |----------------|   _digest()    |------------------|
| state |  -------------------------> | trasient state | -------------->|   updated state  |
|-------|                             |----------------|                |------------------|
                                           ^      |                              | 
                                           |      |                              |   emit event
                                           |_ _ _ |                              V
                                    hub.set('any-prop', val)            |------------------|
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

###on(Array|String[optional], callback)

Listen to any number of prop changes. 
The callback will invoke after a digest cycle only if any listened props were changed
and arguments will be map to the listened props.

If props is not provided, the callback will register as a global callback. It means
the callback will be invoked after each digest.


License
====
MIT
