(function() {
  if (typeof module === "undefined") self.instinct = instinct;
  else module.exports = instinct;

  instinct.version = "0.0.3";

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
    logic = logic || {};
    facts = facts || {};
    
    var process = {},
        instinct = {logic:logic,facts:facts,process:process};

    function generateArgs(args,cb) {
      var d = [];
      for (var key in args) {
        d[args[key]] = (key=="cb") ? cb : facts[key];
      }
      return d;
    }

    instinct.exec = function(ref,cb) {
      var fn,processCb;
      if (typeof ref !== "function") {
        if (facts[ref]) return cb(null,facts[ref]);
        if (processCb = process[ref]) return process[ref] = function() {
          processCb.apply(instinct,arguments);
          if (cb) cb.apply(instinct,arguments);
        };
        fn = logic[ref];
        if (typeof fn !== 'function') return cb(null,facts[ref] = fn);
      } else fn = ref;

      var args = matchArgs(fn),
          req = 0;

      process[ref] = function(err,d) {
        delete process[ref];
        if (!err) facts[ref] = d;
        if (err && !err.ref) err = {ref:ref,err:err};
        if (cb) cb.call(instinct,err,d);
      }

      function queue(err,d) {
        if (arguments.length >1 && err) {
          req = -1;
          process[ref].apply(instinct,arguments)
        }
        
        if(!req--) fn.apply(instinct,generateArgs(args,function() {
            process[ref].apply(instinct,arguments);
        }))
      }

      Object.keys(args).forEach(function(key) {
        if (facts[key] !== undefined || key=="cb") return;
        req++;
        instinct.exec(key,queue)
      })

      queue();

      return instinct;
    }

    instinct.as = function(key) {
      process[key] = noop;
      return function(err,d) {
        facts[key] = (arguments.length == 2) ? d : err;
        console.log(facts[key])
        process[key]();
        delete process[key];
      }
    }

    return instinct
  }

  function noop() {}
})();