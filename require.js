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
      findFile = function(n){
        if(n.slice(n.length-3) !== ".js"){
          n = n+".js"; 
        }
        
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
      addFile = function(file,requiringModule){ 
      
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
                 mName = addFile(dir+"/"+e.split(".")[0]+"/*",file);
               } else {
                 mName = addFile(dir+"/"+e.split(".")[0],file);
               }
               var mNames = mName.split("/*")[0].split("/");
               mName = mNames.slice(0, mNames.length-1).join("/")+"/*";
             }
          });
          return mName;
        }
        
        //add Normal file
        
        // TODO : should be factorise with sandjs
        
        var f = findFile(file);
        if(f){

           if(files[f]) {
             return f;
           }
           //Be Careful just executed the first time
           require(f);
          
           if(!files[file]){
             var fileN = sand.lastDefine;

             if(fileN && (fileN.match(file) || file.match(fileN))){
               file = fileN;
             } else {
               console.log("[WARNING] the file "+file+" define the module "+fileN);
             }
           }
           
           files[file].requires.map(function(f){
             //console.log("[DBG] ",file," require ",f)
             addFile(f,file);
           });

           return file;
           
         } else {
           
           try {
             // load as node module
             require.resolve(file);
             sand.define(file,function(r){
               return require(file); 
             });
             return file;
           } catch(e) {
             console.log("[ERROR] can't find file or module "+file,"required by",requiringModule);
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
      
      defineWithDependencies = function(f) {
        var moduleName = f.split(".js")[0];
      
        // little bit dirty is just to switch sand.define as little as possible
        var changedInAddFile = false;
        if(!requireStatus.serverDefine){
          sand.basicDefine = sand.define;
          sand.define = serverDefine;
          requireStatus.serverDefine = true;
          changedInAddFile = true;
        } 
        
        moduleName = addFile(moduleName);

        changedInAddFile && (sand.define = sand.basicDefine);
        return moduleName;
      },
      serverDefineMany = function(args) {
        sand.basicDefine = sand.define;
        sand.define = serverDefine;
        requireStatus.serverDefine = true;
        var moduleNames = [];
        for(var i = 0; i < args.length; i++) {
          moduleNames.push(defineWithDependencies(args[i]));
        }
        
        requireStatus.serverDefine = false;
        sand.define = sand.basicDefine;
        return moduleNames;
      };
  
  return {
    usages : ["require <file1 file2 ...> : execute modules defined in file1, file2 file3 with all dependencies (if found in paths)"],
    desc : "Launch sandjs files",
    fn : function(args) {
      var modules = serverDefineMany(args);
      sand.require.apply(this,modules);
    },
    serverDefine : defineWithDependencies,
    serverDefineMany : serverDefineMany,
    findFile : findFile,
    files : files
  };
});
