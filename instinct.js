/*global module,self*/
(function() {
  if (typeof module === "undefined") self.instinct = instinct;
  else module.exports = instinct;

  instinct.version = "0.0.7";

  var reArgs = /function.*?\((.*?)\).*/;

  function matchArgs(fn) {
    var match = reArgs.exec(fn.prototype.constructor.toString()),
        args = {};

    if (match[1].length >0) {
      match[1].replace(/\s/g,'').split(",").forEach(function(d,i) {
        args[d] = i;
      });
    }
    return args;
  }

  function instinct(logic,facts) {
    return new Instinct(logic,facts);
  }

  function Instinct(logic,facts) {
    this.logic = logic || {};
    this.facts = facts || {};
    this.process = {};
    this.children = {};
  }

  Instinct.prototype.set = function(ref,value) {
    var self = this;
    self.facts[ref] = value;
    if(self.children[ref]) Object.keys(self.children[ref]).forEach(function(key) {
      if (self.facts[key] !== undefined) self.set(key,undefined);
    });
  };

  Instinct.prototype.exec = function(ref,cb) {
    var self = this,
        fn;

    if (typeof ref !== "function") {
      if (self.facts[ref]) return cb(null,self.facts[ref]);
      var previous=this.process[ref];
      if (previous) {
        self.process[ref] = function() {
          previous.apply(self,arguments);
          if (cb) cb.apply(self,arguments);
        };
        return self;
      }
      fn = self.logic[ref];
      if (typeof fn !== 'function') return (fn !== undefined) ? cb(null,fn) : cb({ref:ref,err:'Not defined'});
    } else fn = ref;

    var args = matchArgs(fn),
        req = 0;

    self.process[ref] = function(err,d) {
      delete self.process[ref];
      if (!err) self.facts[ref] = d;
      if (err && !err.ref) err = {ref:ref,err:err};
      if (cb) cb.call(self,err,d);
    };

    var context = {};   
    context.callback = function() {
      context.callback = noop;
      if (self.process[ref]) self.process[ref].apply(self,arguments);
    };
    context.facts = context.all = self.facts;
    context.success = context.resolve =  function(d) { context.callback(null,d); };
    context.error = context.reject = function(d) { context.callback(d,null); };
    
    function queue(err) {
      if (err) {
        req = -1;
        self.process[ref].apply(self,arguments);
      }
      if(!req--) {
        var resolvedArgs = [];
        for (var key in args) {
          resolvedArgs[args[key]] = (context[key]) ? context[key] : self.facts[key];
        }
        fn.apply(context,resolvedArgs);
      }
    }

    var refs = (args.all>-1) ? Object.keys(self.logic) : Object.keys(args);

    refs.forEach(function(key) {
      if (self.facts[key] !== undefined || key in context) return;
      req++;
      if (typeof ref !== "function") (self.children[key] || (self.children[key]={}))[ref] = true;
      self.exec(key,queue);
    });

    queue();

    return self;
  };

  Instinct.prototype.as = function(ref) {
    var self = this;
    self.process[ref] = noop;
    return function(err,d) {
      if (!err) self.facts[ref] = d;
      if (err && !err.ref) err = {ref:ref,err:err};
      self.process[ref](err,d);
      delete self.process[ref];
    };
  };

  function noop() {}
})();