# instinct.js

**Instinct.js** is a lightweight asynchronous library with a twist.  Inspired by [queue.js](https://github.com/mbostock/queue) and  [require.js](http://requirejs.org/), instinct.js resolves dependencies, as needed, between asynchronous functions, memoizing the output in a "fact table" along with any static inputs supplied.

Each function passed will only execute when it's input arguments values are known (as a `fact`).  Each unknown input value will start off a `logic` function (by same name) that in turn will not return a value until it's own input arguments have been sorted out. This method will greedily queue/execute all the required steps in a mix of parallel and sequential blocks. 

Each logic function will execute only once (if at all) in an instinct object. Multiple requests for the same logic will simply attach to the original request and once the output is known, any further requests will simply return the resolved `fact`, not the `logic` function.

Function signatures are used shortcuts to both declare the variables required and passing them to the relevant `logic` function by name, if needed. Any function argument needs to have a corresponding element within the `instinct` object (by name), either a `fact` (known fixed value) or `logic` (function that can solve for the fact).

## API Reference

### `instinct([logic],[facts])`
Creates a new instinct object based on a particular logic (set of functions by key) and facts (key: value).  Logic and fact objects can be defined/changed later on as they are exposed as properties of the instinct object.

The logic object is used as read-only, allowing the same logic definitions reused for multiple instinct objects (each with a separate fact space),

### `instinct.exec(function(arg1,arg2...) { .... } )`

This schedules an execution of the supplied function.  The argument names of the function will be parsed and matched to facts and logic within the instance object by argument name.  Any arguments that point to neither a fact nor logic will result in an error.  The supplied function is essentially a callback function that is executed when the inputs are known.  

`instinct.exec` can also be called with an argument name (i.e. logic function name) as first argument and a callback function as the second.  This is in fact the way recursive calls are made behind the scenes.

### `instinct.logic = {}`
Key/value dictionary of logic functions. Each logic function must include the argument `cb` as a reference to the callback function used by instinct.  This callback function will have to be executed inside each logic function with the value of the results (`fact`) for the corresponding key.

The callback can be executed either Node style with (error,value) or just the value as an argument.  Errors will however not (yet) be passed upstream currently, only the value.

Any logic element that is not a function will be assumed to be a fact. This is only recommended use for Global Constants, as the logic elements can be asynchronously used by different instinct objects under assymetric information (facts).

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
  .done(I.add("dat"))
```

### `instinct.fact = {}`
Key value dictionary of facts.  Facts can be user supplied, determined by logic functions or both.   Any fact that exists will prevent execution of logic by same name.  

### `instinct.process = {}`
Internal object that keeps track of logic functions that are currently running.  Any requests to logic that is executing will simply attach their callback to the process object to prevent multiple executions.

## Hints and tips

* By defining logic object as the `Window` object, all global functions and variables are made available.

* Complex tree of "knowledge spaces" can be created with multiple instinct object that refer to one another inside respective logic functions

* Whenever there is high likelihood of particular information required shortly at some point, the easiest way is to execute an empty user function, with expected requirements as arguments and no callback.   The logic will appear to have an instinct.js for what might happen next.

* If you want `A` executed before `B`, regardless of the results, simply include `A` as one of the function arguments to `B`, i.e. ```logic.B = function(A,Z,cb) { cb(..do something with Z...)}```

* instinct.js does not handle multiple asynchronous requests for of a single fact (such as an an array that depends on result of multiple request).  Separate counter within a logic function should be used (executing cb when outstanding requests zero) or (better yet) use queue.js to control the sub-logic.

*  This README file is now about 6 times larger than the minified library itself. My instinct tells me I should stop.  