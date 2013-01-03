instinct=require("../instinct")
assert = require("assert")
vows=require("vows")

var logic = {
  A:function(cb) { setTimeout(function() { cb(null,4) },200)},
  B: function(A,cb) { cb(null,A+5)},
  C: 10,
  D: function(B) { return [null,B+9]}
}

var I = instinct(logic);

vows.describe("instinct").addBatch({
  'instinct by function' : {
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
      assert.equal(wait > 200,true,"wait was "+wait)
    },
    "Memoize results" : {
      topic : function() {
        var cb = this.callback
        I.time = new Date()
        I.exec(function(B) {
          cb(null,B)
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
      I.exec("B",cb)
    },
    'returns correct variable' : function(d) {
      assert.equal(d,9)
    }
  },
  "default value in logic" : {
    topic : function() {
      var cb = this.callback;
      I.exec("C",cb)
    },
    "default value is returned" : function(d) {
      assert.equal(d,10)
    },
    "fact table is updated" : function(d) {
      assert.equal(I.facts['C'],10)
    }
  },
  "undefined parameter" : {
    topic : function() {
      var cb = this.callback;
      I.exec("E",cb)
    },
    "returns undefined" : function(d) {
      assert.strictEqual(d,undefined)
    }

  }
})

.export(module)