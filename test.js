var spec = require("vows/lib/vows/reporters/spec");

sand.define("sandcli/test", ["sandcli/require", "sand"], function(r){
  
  var serverRequire = r.require;
  
  var runTests = function(testFiles) {
    var moduleNames = serverRequire.serverDefineMany(testFiles);
    r.sand.require.apply(this,moduleNames.concat([function(r){
      
      for(var i in r) if(r.hasOwnProperty(i) && i !== "tests") {
        r[i].run();
      }
      for(var i in r.tests) if(r.tests.hasOwnProperty(i)) {
        r.tests[i].run({reporter:spec});
      }
    }]));
  };

  return {
    usages : [
      "test : run all the tests cases in ./tests",
      "test <directory> : run all the tests cases in <directory>/tests",
      "test <filename.js> : run all the test in filename",
    ],
    desc : "Run tests",
    fn : function(args) {
      if(args[0]){
        runTests(arguments);
      } else {
        runTests([process.cwd()+"/tests/*"]);
      }
    }
  };
})
