var spec = require("vows/lib/vows/reporters/spec");

sand.define("sandcli/test", ["sandcli/require", "sand", "sandcli/server"], function(r){
  
  var serverRequire = r.require;
  
  var runTests = function(testFiles) {
    
    var i = testFiles.indexOf("--browser")
    if (i !== -1) {
      testFiles.splice(i,1);
      var moduleNames = serverRequire.serverDefineMany(testFiles, {env : "browser"});         
      var fs = ["sandjs/sand"];
      for(var i in serverRequire.files) if(serverRequire.files.hasOwnProperty(i)){
        fs.push(i);
      } 
      var q = r.server.serveAndRequirePage(fs, moduleNames);
      
      console.log("find it at localhost:8899/?query="+q); 
      r.server.fn()
    } else {
      var moduleNames = serverRequire.serverDefineMany(testFiles);
      
      r.sand.require.apply(this, moduleNames.concat([function(r){
        if(typeof(jasmine) !== "undefined" && jasmine) {
          jasmine.getEnv().execute(); 
        } else {
          for(var i in r) if(r.hasOwnProperty(i) && i !== "tests") {
            r[i].run && r[i].run();
          }
          for(var i in r.tests) if(r.tests.hasOwnProperty(i)) {
            r.tests[i].run && r.tests[i].run({reporter:spec});
          }
        } 

      }]));      
    }    

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
        runTests(args);
      } else {
        runTests([process.cwd()+"/tests/*"]);
      }
    }
  };
})
