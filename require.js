var browserify = require('browserify');


sand.define("sandcli/require", ["sandcli/path", "sandcli/exists"], function(r){
  
  var fs    = require("fs"),
      modName,filename,
      exists = fs.existsSync,
      realpath = fs.realpathSync,
      paths = r.path.getPaths(),
      files = {},
      requireStatus = {
        serverDefine : false
      },
      envRequires = {
        node : function(module) {
           sand.define(module, function(){
             return require(module);
           });
           return module;
        },
        
        browser : function(filename) {
          sand.define(filename, function() {
             return {};
          });
          return filename;  
        }
      },
      findFilename = function(n) {
        if(exists(n)){
          return realpath(n);
        }        
        var p;
        for(var i = 0; i < paths.length; i++){
           p = paths[i]+n;
           if(exists(p)){
             return realpath(p);
           }
        }     
        // find module and search in module/lib/module
        var pack = n.split("/")[0],p2;
        if(p2 = findPath(pack)){ 
           p = p2+"/lib/"+n;
           if(exists(p)){
             return p;
           }
        }  
      },
      
      findFile = function(name, options){
        if(files[name] && files[name].filename){
          return files[name].filename;
        }
        var env = (options && options.env) || "node", n; 
        
        n = (name.slice(name.length-env.length) !== env) ? name+"."+env+".js" : name;
        var f = findFilename(n);
        //console.log(n,f);
        
        if(f) return f;        
        n = (name.slice(name.length-3) !== ".js") ? name+".js" : name;
        var f = findFilename(n);
        if(f) return f;
        

        
      },
      findPath = function(n){
        if(exists(n)){
          return realpath(n);
        }
        var p;
        for(var i = 0; i < paths.length; i++){
           p = paths[i]+n; 

           if(exists(p)){
             return realpath(p);
           }
        }
      },
      addFile = function(file, requiringModule, options){

        var env = (options && options.env) || "node";
        if(file[0] === ".") {
          if(file[1] === "/"){
            var path = requiringModule.split("/");
            return addFile(path.slice(0,path.length-1).concat([file.substr(2)]).join("/"), requiringModule, options);
          } else if(file[1] === "." && file[2] === "/"){
            var path = requiringModule.split("/");
            return addFile(path.slice(0,path.length-2).concat([file.substr(3)]).join("/"), requiringModule, options);
          } 
          
        }
        
        if(files[file]){
          return file;
        }
        
        //add Recursive Files
        // TODO : should be factorise with sandjs
        if(file[file.length-1] === "*"){
          var dir = file.slice(0,file.length-2);
          var f = findPath(dir),
              mName;

          fs.readdirSync(f).map(function(e){
          
             var f = findFile(dir+"/"+e.split(".")[0]) || findPath(dir+"/"+e);
             
             var stats = fs.lstatSync(f);
             if(e !== "spec" && e!== "test"){
               if (stats.isDirectory()) {
                 mName = addFile(dir+"/"+e.split(".")[0]+"/*", file, options);
               } else {
                 mName = addFile(dir+"/"+e.split(".")[0], file, options);
               }
               var mNames = mName.split("/*")[0].split("/");
               mName = mNames.slice(0, mNames.length-1).join("/")+"/*";
             }
          });
          return mName;
        }
        
        //add Normal file
        
        // TODO : should be factorise with sandjs
        
        var f = findFile(file, options);
        if(f && files[f]){
          return f;
        } else if (f) {
          sand.lastDefine = false;
          try {
            require(f);
          } catch(e){
            
          }
          var fileN = sand.lastDefine;

          if(fileN && (fileN.match(file) || file.match(fileN))){
            file = fileN;
            
            files[file].requires.map(function(f){
              //console.log("[DBG] ",file," require ",f)
              addFile(f,file, options);
            });
            
            return file;
          } else if(fileN === false) {
            // f doesn't define anything 
            return envRequires[env](file);
          } else {
            console.log("[WARNING] the file "+file+" define the module "+fileN);
          } 
        } else {
           
           try {
             // does it exist when we load it as node module ?
             if(env === "node") {    
               
               require.resolve(file);
               return envRequires[env](file);
                 
             } else if(env == "browser"){
               
               var b = browserify({});
                    
               b.ignore("lapack");  
               var rs = {};
               b.require(file);
               var txt = b.bundle(); 
                  
               txt = "sand.define('" + file + "',function(){\n\n"+txt+"\n  return require('"+file+"')})";
               
               files[file] = { 
                 requires : [], 
                 filename :  "/Users/piercus/.sandcli/tmp/"+file+".browser.js"
               }; 
               fs.writeFileSync(
                 "/Users/piercus/.sandcli/tmp/" + file + ".browser.js", 
                 txt, 
                 "utf8");       
               return file;
             } else {
               throw Error("[ERROR] your environment "+env+" does not handle file, try ading "+file+"."+env+" somwhere in sandjs paths");
             }
             
           } catch(e) {
             console.log("[ERROR] can't find file or module "+file,"required by",requiringModule,e);
           }
         }
      },
      
      // serverDefine is a way to define 
      serverDefine = function(n,r){
        //console.log("[DBG]",n);
        files[n] || (files[n] = {});
        files[n].requires = [];
        if(typeof(r) === "object" && r.length){
          for(var i = 0; i < r.length; i++){
             files[n].requires.push(r[i].split("->")[0]);
          }
        } else if(typeof(r) === "string"){
          files[n].requires.push(r.split("->")[0]);
        }
        sand.lastDefine = n.toString();
        sand.basicDefine.apply(this,arguments);
      },
      
      defineWithDependencies = function(f, options) {
        var moduleName = f.split(".js")[0];
      
        // little bit dirty is just to switch sand.define as little as possible
        var changedInAddFile = false;
        if(!requireStatus.serverDefine){
          sand.basicDefine = sand.define;
          sand.define = serverDefine;
          requireStatus.serverDefine = true;
          changedInAddFile = true;
        } 
        
        moduleName = addFile(moduleName, null, options);

        changedInAddFile && (sand.define = sand.basicDefine);
        return moduleName;
      },
      serverDefineMany = function(args, options) {
        sand.basicDefine = sand.define;
        sand.define = serverDefine;
        requireStatus.serverDefine = true;
        var moduleNames = [];
        for(var i = 0; i < args.length; i++) {
          moduleNames.push(defineWithDependencies(args[i], options));
        }
        
        requireStatus.serverDefine = false;
        sand.define = sand.basicDefine;
        return moduleNames;
      };
  
  return {
    usages : ["require <file1 file2 ...> : execute modules defined in file1, file2 file3 with all dependencies (if found in paths)"],
    desc : "Launch sandjs files",
    fn : function(args, options) {
      var modules = serverDefineMany(args, options);
      sand.require.apply(this,modules);
    },
    serverDefine : defineWithDependencies,
    serverDefineMany : serverDefineMany,
    findFile : findFile,
    files : files
  };
});
