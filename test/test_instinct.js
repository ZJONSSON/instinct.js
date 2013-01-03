instinct=require("../instinct")
assert = require("assert")
vows=require("vows")

var logic = {
  A:function() { var self=this; setTimeout(function() { self.callback(null,4) },200)},
  B: function(A,callback) {callback(null,A+5)},
  C: 10,
  D: function(A) { this.fact(A+10)},
  E: function(A) { 
    this.fact(A+10);
    this.fact(A+50);
    this.error(A+50);
    this.callback(A+50,A+50)
  },
  F: function(A) { this.error("Could not process")},
  G : function(A,F) { this.callback(null,A+10)},
  H : function(A,callback) { callback(null,A+50)},
  M1 : function(callback) {  setTimeout(function() { callback(null,10)},100)},
  M2 : function(callback) {  setTimeout(function() { callback(null,20)},300)},
  M3 : function(M1,M2,callback) {  setTimeout(function() { callback(null,M1+M2)},50)},
  M4 : function(callback) { setTimeout(function() { callback(null,70)},150)},
  MTOP : function(M3,M4) { this.callback(null,M3+M4)}
}

var I = instinct(logic);

vows.describe("instinct").addBatch({
  'instinct.exec with a function' : {
    topic : function() {
      var cb = this.callback;
      I.time = new Date();
      I.exec(function(B) {
        cb(null,B)
      })
    },
    "returns correct variable" : function(d) {
      assert.equal(d,9)
    },
    "waits for execution" : function(d) {
      var wait = (new Date()) -I.time
      assert.equal(wait >= 200,true,"wait was "+wait)
    },
    "Memoization as facts" : {
      topic : function() {
        var that = this;
        
        I.time = new Date()
        I.exec(function(B) {
          that.callback(null,B)
        })
      },
      "The time to fetch again is zero" : function(d) {
        var wait = (new Date()) -I.time
        assert.equal(wait<5,true,"wait was "+wait)
      }
    }
  },
  'instinct by name' : {
    topic : function() {
      var cb = this.callback;
      I.exec("B",this.callback)
    },
    'returns correct variable' : function(d) {
      assert.equal(d,9)
    }
  },
  "default value in logic" : {
    "without a fact" : {
      topic : function() {
        var cb = this.callback;
        I.exec("C",cb)
      },
      "logic value is returned as a fact" : function(d) {
        assert.equal(d,10)
      },
      "fact table is updated" : function(d) {
        assert.equal(I.facts['C'],10)
      }
    },
    "with a overriding fact" : {
      topic : function() {
        var I = instinct(logic,{C:20})  
        I.exec("C",this.callback)
      },
      "returns the fact, not the default value" : function(d) {
        assert.equal(d,20)
      }
      
    }
  },
  "undefined parameter" : {
    topic : function() {
      var cb = this.callback;
      I.exec("NOT EXISTS",cb)
    },
    "returns undefined" : function(d) {
      assert.strictEqual(d,undefined)
    }
  },
  "this.fact" : {
    topic : function() {
      I.exec("D",this.callback)
    },
    "returns same value as using callback" : function(d) {
      assert.equal(d,14)
    }
  },
  "multiple callbacks" : {
    topic : function() {
      I.exec("E",this.callback)
    },
    "only use the first one" : function(d) {
      assert.equal(d,14)
    }
  },
  "errors" : {
    topic : function() {
      I.exec("G",this.callback)
    },
    "throws an error" : function(err,d) {
      assert.deepEqual(err,{ ref: 'F', err: 'Could not process' })
    },
    "Facts from error and up are undefined" : function(err,d) {
      assert.equal(I.facts.F,undefined)
      assert.equal(I.facts.G,undefined)
    }
  },
  "callback argument in logic function" : {
    topic: function() {
      I.exec("H",this.callback)
    },
    "is the same as using this.callback" : function(d) {
      assert.equal(d,54)  
    }
  },
  "complex tree of dependancies" : {
    topic : function() {
      I.exec("MTOP",this.callback)
    },
    "returns the top value" : function(d) {
      assert.equal(d,100)
    },
    "and leaves the trail in the fact table" : function(d) {
      assert.isNumber(I.facts.M1)
      assert.isNumber(I.facts.M2)
      assert.isNumber(I.facts.M3)
      assert.isNumber(I.facts.M4)
    }
  }
  
})

.export(module)