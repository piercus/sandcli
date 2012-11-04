var fjsPath = __dirname+"/main.js",
    debugLvl = "warning";

GLOBAL.fjs = require(fjsPath).exports;
GLOBAL.sand = GLOBAL.fjs;
require("/home/pier/TMT/app/assets/javascripts/plugins/debug.js");
var fs = require("fs"),modName,filename;

// read arguments, second argument is the fileName
process.argv.forEach(function (val, index, array) {
  if(index == 2){
    modName = fs.readFileSync(val, "utf-8").match(/fjs\.define\(.([a-zA-Z0-9\/]*)/)[1];
    filename = val;
  } else if(index == 3){
    debugLvl = val;
  }
});
var path = require('path');     
var paths = [
  "/home/pier/TMT/app/assets/javascripts/modules/",
  "/home/pier/TMT/app/assets/javascripts/app/",
  "/home/pier/TMT/specjs/",
  "/home/pier/TMT/script/",
  "/home/pier/fjs-modules/",
  "/home/pier/",""
],files = {};


var findFile = function(n){
  var p;                   
  if(n.slice(n.length-3) !== ".js"){
     n = n+".js"; 
   }
   
  for(var i = 0; i < paths.length; i++){
     p = paths[i]+n; 
     if(path.existsSync(p)){
       return p;
     }
  }
};

var findPath = function(n){
  var p;
  for(var i = 0; i < paths.length; i++){
     p = paths[i]+n; 
     if(path.existsSync(p)){
       return p;
     }
  }
};

var addFile = function(file,requiringModule){ 
  //console.log("file",file)
  if(files[file]){
    return
  }
  if(file[file.length-1] === "*"){
    var dir = file.slice(0,file.length-2);
    var f = findPath(dir);
    fs.readdirSync(f).map(function(e){
       //console.log("[DBG] ",file," require ",dir+"/"+e.split(".")[0])
       var f = findFile(dir+"/"+e.split(".")[0]) || findPath(dir+"/"+e);
       
       var stats = fs.lstatSync(f);
       if(e !== "spec" && e!== "test"){
         if (stats.isDirectory()) {
           addFile(dir+"/"+e.split(".")[0]+"/*",file);
         } else {
           addFile(dir+"/"+e.split(".")[0],file);
         }
       }
    });
    return;
  }
  var f = findFile(file);
   if(f){
     if(files[f]) {
       console.log("files contain"+f);
       return;
     }
     //Be Careful just executed the first time
     require(f);
    
     if(!files[file]){
       console.log("[WARNING] "+file+" doesn't define himself");
       return;
     }   
     files[file].requires.map(function(f){
       //console.log("[DBG] ",file," require ",f)
       addFile(f,file);
     });
     
   } else {
     try {
       require.resolve(file);
       fjs.define(file,function(r){
         return require(file); 
       });
     } catch(e) {
       console.log("[ERROR] can't find file or module "+file,"required by",requiringModule);
     }
   }
};
fjs.oldFjsDefine = fjs.define;
fjs.define = function(n,r){
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
  fjs.oldFjsDefine.apply(this,arguments);
};

addFile(modName);  

fjs.use(modName);


