var e = require("express"),
    app  = e(),
    fs = require("fs");

sand.define("sandcli/server", ["sandcli/merge", "sandcli/min", "sandcli/require"], function(r){
  var served = {};
  
  var getModules = function(req) {
    if (served[req.query && req.query.query]){
      return served[req.query && req.query.query];
    } else if (req.query && req.query.query) {
      return [req.query.query];
    } else {                   
      return false;
    } 
  }
  
  return {
    desc : "Serve sandjs files in path with dependencies",     
    usages : ["server : start a server on http://localhost:8899/moduleName", "server -p <port> --min : served on http://localhost:<port>/?require=moduleName a minified file"],
    fn : function(args) {
      args || (args = []);
      var iP   = args.indexOf("-p"),
          port = ((iP!==-1) && args[iP+1]) || 8899;              
          
      app.get("/require", function(req, res) {      
         var mods = getModules(req); 
         res.setHeader('Content-Type',"text/javascript");
         
         if (mods && mods.length > 0){
           var text = r.merge.getText(mods, {"env" : "browser"});
           res.send(text);
         } else {
           res.send("Sand server is working");
         }

      });
      
      app.get("/html", function(req, res) {
        var mods = getModules(req);      
         res.send("<html><head></head><body><script src='/require?query="+req.query.query+"' type='text/javascript'></script><script>sand.require("+mods.map(function(e){return "'"+e+"'";}).join(",")+");</script></body></html>");
      }); 
      
           
      app.get("*", function(req, res) {      
         res.setHeader('Content-Type',"text/javascript");
         console.log(req.route.params[0].substr(1));  res.send(fs.readFileSync(r.require.findFile(req.route.params[0].substr(1), { env : "browser"})));

      });
      console.log("=> sand server start at http://localhost:"+port);
            
      app.listen(port);    
    },
    serve : function(moduleNames) {
      served[moduleNames.length] = moduleNames;
      return moduleNames.length;
    },
    serveAndRequirePage : function(files,mods) {
      served[mods.length] = mods;   

      var scriptDeps = files.map(function(e){
        return "<script type='text/javascript' src='http://localhost:8899/"+e+"'></script>";
      }).join("");
      
      var port = 8899;
      app.get("/test", function(req, res){
        var mods = getModules(req); 
        
        res.send("<html><head></head><link rel='stylesheet' href='http://pivotal.github.com/jasmine/lib/jasmine.css'></style>"+scriptDeps+"<script>sand.require("+mods.map(function(e){return "'"+e+"'";}).join(",")+", function(r){\nwindow.onload=function(){\nvar htmlReporter = new jasmine.HtmlReporter();\njasmine.getEnv().addReporter(htmlReporter);\n\n if(jasmine) {\n  jasmine.getEnv().execute(); \n} else {\n for(var i in r) if(r.hasOwnProperty(i) && i !== 'tests') {\n r[i].run();\n } for(var i in r.tests) if(r.tests.hasOwnProperty(i)) {\n r.tests[i].run();\n } }\n};\n }); </script> <body></body></html>");
      });
      console.log("=> sand server start at http://localhost:"+port+"/test");
      return files.length;
      
      
    }
  }
});