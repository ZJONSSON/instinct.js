instinct=require("../instinct")
assert = require("assert")
vows=require("vows")

var simple = {
  A: function(resolve) { setTimeout(function() { resolve(42)},200)},
  B: function(A,resolve) { setTimeout(function() { resolve("Answer is "+A)})},
  irrelevant : function(resolve) { setTimeout(function() { resolve("irrelevant")})},
  default : 999
}

var complex = {
  M1 : function(callback) {  setTimeout(function() { callback(null,10)},100)},
  M2 : function(callback) {  setTimeout(function() { callback(null,20)},300)},
  M3 : function(M1,M2,callback) {  setTimeout(function() { callback(null,M1+M2)},50)},
  M4 : function(callback) { setTimeout(function() { callback(null,70)},150)},
  MTOP : function(M3,M4) { this.callback(null,M3+M4)}
}

var S1 = instinct(simple),
    S2 = instinct(simple),
    C2 = instinct(complex),
    E1;
 
vows.describe("instinct").addBatch({
  "instinct by function" : {
    topic : function() {
      var self = this;
      instinct(simple).exec(function(A) { self.callback(null,A)})
    },
    "returns correct value" : function(d) {
      assert.equal(d,42)
    },
  },
  "instinct by name" : {
    topic : function() {
      instinct(simple).exec("A",this.callback)
    },
    "returns correct value" : function(d) {
      assert.equal(d,42)
    }
  },
  'instinct.facts' : {
    topic : function() {
      var self = this;
      S1.time = new Date();
      S1.exec(function(A) { self.callback(null,A) })
    },
    "returns correct variable" : function(d) {
      assert.equal(d,42)
    },
    "waits for execution" : function(d) {
      var wait = (new Date()) - S1.time
      assert.equal(wait >= 200,true,"wait was "+wait)
    },
    "fact table reflects the value" : function(d) {
      assert(S1.facts.A,42)
    },
    "only required facts are resolved " : function(d) {
      assert.isUndefined(S1.facts.C)
    },
    "memoization" : {
      topic : function() {
        var that = this;
        S1.time = new Date()
        S1.exec(function(A) {
          that.callback(null,A)
        })
      },
      "The time to fetch again is zero" : function(d) {
        var wait = (new Date()) -S1.time
        assert.equal(wait<50,true,"wait was "+wait)
        assert.equal(d,42)
      }
    }
  },

  "default value in logic" : {
    "without a fact" : {
      topic : function() {
        S2.exec("default",this.callback)
      },
      "logic value is returned as a fact" : function(d) {
        assert.equal(d,999)
      },
      "fact table is not updated" : function(d) {
        assert.isUndefined(S2.facts['default'])
      }   
    },
    "with a overriding fact" : {
      topic : function() {
        instinct(simple,{"default":20})
          .exec("default",this.callback)
      },
      "returns the fact, not the default value" : function(d) {
        assert.equal(d,20)
      }
      
    }
  },
  "non-existing argument" : {
    topic : function() {
      instinct(simple).exec("SOMETHING",this.callback)
    },
    "returns an error" : function(err,d) {
      assert.deepEqual(err, { ref: 'SOMETHING', err: 'Not defined' })
      assert.isUndefined(d)
    }
  },

  "multiple callbacks" : {
    topic : function() {
      instinct({
        A : function(resolve,callback,error) {
          callback(null,42)
          callback(null,19)
          
        }
      }).exec("A",this.callback)
      
    },
    "only first callback is used, rest goes to noop()" : function(d) {
      assert.equal(d,42)
    }
  },
  "errors" : {
    topic : function() {
      E1 = instinct({
        ERR : function(error) { error("Could not process")},
        DEP : function(ERR,callback) { callback(42)}
      })
      E1.exec("DEP",this.callback)
    },
    "show up as first argument (err)" : function(err,d) {
      assert.deepEqual(err,{ ref: 'ERR', err: 'Could not process' })
    },
    "facts of the error ref and all dependents are undefined" : function(err,d) {
      assert.isUndefined(E1.facts.F)
      assert.isUndefined(E1.facts.G)
    }
  },
  
 
  "reserved function arguments defined in the context object" : {
    topic : function() {
      var that = this;
      instinct(simple).exec(function(facts,callback,success,resolve,error,reject,A) {
        that.callback(null,{facts:facts,callback:callback,success:success,resolve:resolve,error:error,reject:reject})
      })
    },
    "facts is an object" : function(d) {
      assert.isObject(d.facts);
    },
    "callback, resolve/success and reject/error are functions" : function(d) {
      assert.isFunction(d.callback)
      assert.isFunction(d.success)
      assert.isFunction(d.resolve)
      assert.isFunction(d.error)
      assert.isFunction(d.reject)
    }
  },

   "complex tree " : {
    topic : function() {
      C1 = instinct(complex)
        .exec("MTOP",this.callback)
    },
    "is resolved to the top value" : function(d) {
      assert.equal(d,100)
    },
    "" : {
      topic : function() {
        var self=this;
        C1.exec(function(facts) {
          self.callback(null,facts)
        })
      },
      "fact table is correct" : function(d) {
        assert.isNumber(d.M1)
        assert.isNumber(d.M2)
        assert.isNumber(d.M3)
        assert.isNumber(d.M4)
        assert.isNumber(d.MTOP)
      }
      , "exec.set()" : {
        topic : function() {
          C1.set("M1",20)
          return true
        },
        "changes the respective value" : function(d) {
          assert.equal(C1.facts.M1,20)
        },
        "and sets children of that reference to undefined" : function(d) {         
          assert.isUndefined(C1.facts.M3)
          assert.isUndefined(C1.facts.MTOP)
        },
        "without touching the other facts" : function(d) {
          assert.isNumber(C1.facts.M2)
          assert.isNumber(C1.facts.M4)
        },
        "... subsequent exec" : {
          topic : function() {
            C1.exec("MTOP",this.callback)
          },
          "returns an updated value based on the new fact" : function(d) {
            assert.equal(d,110)
          }
        }
      }
    }
  },

  "keyword all" : {
    topic : function() {
      var that = this
      instinct(complex)
      .exec(function(all) { that.callback(null,all)})
    },
    "returns all facts as resolved"  : function(d) {
      assert.isNumber(d.M1)
      assert.isNumber(d.M2)
      assert.isNumber(d.M3)
      assert.isNumber(d.M4)
      assert.isNumber(d.MTOP)
      assert.equal(d.MTOP,100)
    }
  }
})

.export(module)