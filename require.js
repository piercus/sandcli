var browserify = require('browserify');


sand.define("sandcli/require", ["sandcli/path", "sandcli/exists"], function(r){
  
  var fs    = require("fs"),
      modName,filename,
      exists = fs.existsSync,
      realpath = fs.realpathSync,
      wrappers = [],
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
        // search in paths define with sand path
        for(var i = 0; i < paths.length; i++){
           p = paths[i]+n;
           if(exists(p)){
             return realpath(p);
           }
        }             

      },
      
      findFile = function(name, opts){
        var f, options = opts || {};
        //console.log("findFile", name);
        if(files[name] && files[name].filename){
          return files[name].filename;
        }
        var env = (options && options.env) || "node", n; 
        
        n = (name.slice(name.length-env.length) !== env) ? name+"."+env+".js" : name;
        f = findFilename(n);
        //console.log(n,f);
        
        if(f) return f;        
        n = (name.slice(name.length-3) !== ".js") ? name+".js" : name;
        f = findFilename(n);
        if(f) return f;   
        
        f = findFilenameInPackage(name, name.split("/")[0]);
        if(f) return f;
        
        options.requiringModule && (f = findFilenameInPackage(name, options.requiringModule.split("/")[0]));
        if(f) return f;

      },
      findFilenameInPackage = function(name, pack){
        var p2, f;
        if(p2 = findPath(pack)){
          // 1. search in module/packages.json to see if there is a '_sand' key
          var packFile = p2+"/package.json", modules, _sand, wrapper;
          
          if(exists(packFile)){                                     
             _sand = JSON.parse(fs.readFileSync(packFile))["_sand"];            
             if(typeof(_sand) === "object"){
               modules = _sand["modules"];
               wrapper = _sand.wrapper;
               if(wrapper = findFile(wrapper)){
                 if(!files[wrapper]){
                   require(wrapper); 
                   files[wrapper] = {
                     requires : [],
                     wrapper : true
                   };
                 }
               }
               if(_sand["modules"][name]){
                 f = findFile(_sand["modules"][name]);
                 if(f) return f;
               }
             }
           }
           //console.log("Cannot find module named ", name, packFile, exists(packFile), _sand, _sand["modules"][name], findFilename(_sand["modules"][name]+".js"));
           
           
          // 2. search in module/lib for a file
          // find based module 
          p = p2+"/lib/"+name;
          f = findFile(p);
          if(f){
            return f;
          }   

        } else {
          // the package doesn't exist
        } 
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
      addFile = function(file, options){

        var env = (options && options.env) || "node",
            requiringModule = options.requiringModule;
        if(file[0] === ".") {
          if(file[1] === "/"){
            var path = requiringModule.split("/");
            return addFile(path.slice(0,path.length-1).concat([file.substr(2)]).join("/"), options);
          } else if(file[1] === "." && file[2] === "/"){
            var path = requiringModule.split("/");
            return addFile(path.slice(0,path.length-2).concat([file.substr(3)]).join("/"), options);
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
             
               var nOptions = {};
               //clone options
               for(var key in options) if(options.hasOwnProperty(key)){
                 nOptions.key = options.key;
               }
               
               nOptions.requiringModule = file;
               
               if (stats.isDirectory()) {
                 mName = addFile(dir+"/"+e.split(".")[0]+"/*", nOptions);
               } else {
                 mName = addFile(dir+"/"+e.split(".")[0], nOptions);
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
            options.requiringModule = file;
            files[file].requires.map(function(f){
              //console.log("[DBG] ",file," require ",f)
              addFile(f, options);
            });
            
            return file;
          } else if(fileN === false) {
            // f doesn't define anything 
            return envRequires[env](file);
          } else {
            console.log("[WARNING] the file "+file+" define the module "+fileN);
          } 
        } else {
           // 1. maybe it exists in the requiringModule lib files
           
           
           //2. does it exist when we load it as node module ?          
           try {

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
        //console.log("[DBG] server Define",n);
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
        
        moduleName = addFile(moduleName, options);

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
      sand.require.apply(this, modules);
    },
    serverDefine : defineWithDependencies,
    serverDefineMany : serverDefineMany,
    findFile : findFile,
    files : files
  };
});
