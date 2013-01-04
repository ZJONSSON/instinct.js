(function() {
  if (typeof module === "undefined") self.instinct = instinct;
  else module.exports = instinct;

  instinct.version = "0.0.6";

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
  }

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
      if (typeof fn !== 'function') return (fn !== undefined) ? cb(null,self.facts[ref]=fn) : cb({ref:ref,err:'Not defined'});
    } else fn = ref;

    var args = matchArgs(fn),
        req = 0;

    self.process[ref] = function(err,d) {
      delete self.process[ref];
      if (!err) self.facts[ref] = d;
      if (err && !err.ref) err = {ref:ref,err:err};
      if (cb) cb.call(self,err,d);
    };

    var context = {
      callback : function() {
        this.callback = noop;
        self.process[ref].apply(self,arguments);
      },
      fact : function(d) { this.callback(null,d); },
      error : function(d) { this.callback(d); },
      facts : self.facts
    };

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
 
    Object.keys(args).forEach(function(key) {
      if (self.facts[key] !== undefined || key in context) return;
      req++;
      self.exec(key,queue);
    });

    queue();

    return self
  };

  Instinct.prototype.as = function(key) {
    this.process[key] = noop;
    return function(err,d) {
      if (!err) self.facts[ref] = d;
      if (err && !err.ref) err = {ref:ref,err:err};
      process[key](err,d);
      delete process[key];
    };
  };

  function noop() {}
})();