(function() {
var reArgs = /function \((.*?)\).*/;

matchArgs = function args(fn) {
  var match = reArgs.exec(fn.prototype.constructor.toString()),
      args = {};

  if (match[1].length >0) {
    match[1].split(",").forEach(function(d,i) {
      args[d] = i;
    })
  } 
  return args;
}

instinct = function(logic,facts) {
  logic = logic || {};
  facts = facts || {};
  
  var process = {},
      instinct = {logic:logic,facts:facts,process:process};

  function generateArgs(args,cb) {
    var d = []
    for (key in args) {
      d[args[key]] = (key=="cb") ? cb : facts[key];
    }
    return d;
  }

  instinct.exec = function(fn,cb) {
    var args = matchArgs(fn)
    var req = 0;

    function done() {
      if(!req--) {
        fn.apply(this,generateArgs(args,cb));
      }
    };
    
    Object.keys(args).forEach(function(key) {
      if (facts[key] || key=="cb") return;
      req+=1;
      var isRunning = process[key];
      if (isRunning) {
        process[key] = function(d) {
          isRunning(d);
          done();
        }
      } else {
        process[key] = function(d) {
          facts[key] = d;
          delete process[key]
          done();
        }
        instinct.exec(logic[key],function(d) {
          process[key](d)
        })
      }
    })
    done();
    return instinct;
  }

  return instinct
}

})();