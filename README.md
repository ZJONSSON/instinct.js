# instinct.js

**Instinct.js** is a lightweight asynchronous library with a twist.  Inspired by [queue.js](https://github.com/mbostock/queue),   [require.js](http://requirejs.org/) and [async.js](https://github.com/caolan/async), this library resolves dependencies, as needed, between asynchronous functions, memoizing the output in a "fact table" along with any static inputs supplied.  

The magic of instinct.js lies in signatures of logic functions (or functions passed to instinct.exec).  Unlike regular functions, each argument name of a logic function must correspond to the name of a `fact` or `logic` component. This structure simultaneously defines the required dependencies for each function, as well as assigning the resolved dependencies as local variables to the function.   If a `fact` with the same name as a function argument already exists (either previously resolved, or supplied directly), it is simply passed on as an argument value to the function.  If a fact is unresolved (i.e. undefined), a logic function with same name is executed to resolve the fact value, before passing it on to the original function for execution.   If an argument name can neither be matched with a fact nor a logic function/value an error is raised.

Each logic function will only execute when it's input arguments values are known (as a `fact`).  Each unknown input value will start off a `logic` function (by same name) that in turn will not return a value until it's own input arguments have been sorted out. This method will greedily queue/execute all the required steps in a mix of parallel and sequential blocks. 

Each logic function will execute only once (if at all) in an instinct object. Multiple requests for the same logic will simply attach to the original request callback and once the output is known, any further requests will simply return the resolved `fact` (or an error, respectively)

## API Reference

### `instinct([logic],[facts])`
Creates a new Instinct object based on a particular logic (set of functions and values by reference) and facts (ref: value).  Logic and fact objects can be defined/modified later as they are public variables of the instinct object.

The logic object is used as read-only (i.e. any results will only alter fact object, not the logic object), allowing the same logic definitions to be reused for multiple instinct objects (each with a separate fact space).  Instinct object can furthermore be chained by requiring any logic function of one Instinct object to use .exec() function of another.

### `instinct.exec(function(arg1,arg2...) { .... } ,[error_callback])`
This schedules an execution of the supplied function.  The argument names of the function will be parsed and matched to facts and logic within the instance object by argument name.  Any arguments that point to neither a fact nor logic will result in an error.  The supplied function is essentially a callback function that is executed when the inputs are known.  

The second argument (optional) is labeled `error_callback` here to clarify typical usage.   The first function does not have to include an instinct callback at all, as it has no dependancies.  With no callback inside the first function, the second callback will therefore only be initiated if there are errors in any of the dependancies of the first function.


### `instinct.exec("name",callback)`
The exec function can also be called with a string name as first parameter and a callback function as the second parameter.  This is essentially the same as calling instinct exec with a function with only one variable (i.e. name) and is ideal if you need to only work with one fact object.

All callbacks should return two arguments `this.callback(err,value)` following typical node.js conventions.

### `instinct.logic = {}`
Key/value dictionary of logic functions and/or values.   Functions in the logic object must only contain arguments names that correspond to either facts or as other logic functions/values.    Each logic function must execute a callback at some point with the resolved value or an error. The typical way to execute the callback is to call `this.callback(err,value)` ensuring that the `this` object passed at the top is stored as a local variable if the results are returned from a deeper scope.

##### `this` context for logic functions

There are multiple ways to initiate callbacks from a logic function, using `this` object.  The context of `this` object is not the instinct object itself, but an artificial context, specific to the function itself, containing the following references:

`this.facts` is a reference to the current facts object of the instinct instance (should not be used really, except to overwrite other facts)

`this.all` is same as `this.facts` except it forces a complete exec() of all unresolved definitions in the logic object.  

`this.callback` is the standard callback that requires `(err,value)` as parameters

`this.success` is syntax sugar for `this.callback(null,value)`

`this.error` is syntax sugar for `this.callback(error,null)`

Additionally we have `this.resolve` and `this.reject` for those who like jquery promises way of resolving outstanding requests.


##### Bonus level - this properties as reserved argument names
Most asynchronous functions lose the context of the original `this` object requiring the programmer to store `this` as a local `that` or `self` at the top of the function.  In an attempt to eliminate this tedious requirement, all properties of `this` object are injected as function 
arguments if/when their names appear as arguments in the function signature.  This obviously means that those names are reserved and cannot be used as names of facts or custom logic.

Example:

```js
function(name,db) {
  var that = this;
  async.function(db,function(d) {
    another_async(name,function(e,f,g,h) {
       that.resolve(g)
    })
  })
}
```
can be simplified to the following:

```js
function(name,db,resolve) {
  async.function(db,function(d) {
    another_async(name,function(e,f,g,h) {
       resolve(g)
    })
  })
}
```


##### Non-functions = default values
Any logic element that is not a function will be assumed to be a default value for the same fact. This is only recommended for Global Constants, as the logic elements can be asynchronously used by different instinct objects under asymmetric information (facts).

### `instinct.as(name)`
Helper that returns a callback function which, when executed, updates the corresponding `instance.fact` (by name).   This helper eliminates the need to write wrappers around independent functions that can execute immediately.  The execution of the `instinct.as()` itself should not be delayed inside higher callbacks, as it registers the name within the instance object, allowing other functions to queue up for the results.

We can for example write this:

```js
I.logic.dat = function(cb) {
  $.ajax("./somefile.txt")
    .done(cb)
}
```
simply .as this:

```js
$.ajax("./somefile.txt")
  .done(I.as("dat"))
```

### `instinct.set(name,value)`
Sets a particular fact (by name) to a particular value.   This will override any logic for the same name.  Additionally, any other facts that depend on this value  (if any) will be set to `undefined` to ensure they will be re-evaluated next time (if ever) they are requested through `instinct.exec`. 

### `instinct.facts = {}`
Key value dictionary of facts.  Facts can be user supplied, determined by logic functions or both.   Any fact that exists will prevent execution of logic by same name.   

### `instinct.process = {}`
Internal object that keeps track of logic functions that are currently running.  Any requests to logic that is executing will simply attach their callback to the process object to prevent multiple executions.

## Hints and tips

* By defining logic object as the `Window` object, all global functions and variables are made available.

* Complex tree of "knowledge spaces" can be created with multiple instinct object that refer to one another inside respective logic functions

* Whenever there is high likelihood of particular information required shortly at some point, the easiest way is to execute an empty user function, with expected requirements as arguments and no callback.   The logic will appear to have an instinct.js for what might happen next.

* If you want `A` executed before `B`, regardless of the results, simply include `A` as one of the function arguments to `B`, i.e. ```logic.B = function(A,Z,callback) { callback(..do something with Z...)}```

* instinct.js does not handle multiple asynchronous requests for of a single fact (such as an an array that depends on result of multiple request).  Separate counter within a logic function should be used (executing `callback` when outstanding requests zero) or (better yet) use queue.js to control the sub-logic.

*  This README file is now about 6 times larger than the minified library itself. My `instinct` tells me I should stop, as most of the facts should be resolved.