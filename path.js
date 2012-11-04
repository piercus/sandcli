var fs = require("fs");

sand.define("sandcli/path", function(r){
  var getUserHome = function() {
        return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
      },
      directoryPath = getUserHome()+"/.sandcli",
      configFilename = directoryPath+"/config.json",
      doesExist = function(){
        if(fs.existsSync(configFilename)){
          return true;
        }
      },
      getConfig = function() {
        if(doesExist()) {
          return JSON.parse(fs.readFileSync(configFilename), "utf8");
        } else {
          return {
            paths : []
          };
        }
      },
      setConfig = function(json) {
        if(!doesExist()) {
          fs.mkdirSync(directoryPath);
        }
        fs.writeFileSync(configFilename, JSON.stringify(json, null, 2), "utf8");
      },
      addPath = function(path) {
        var config = getConfig();
        config.paths.push(path);
        setConfig(config);
        console.log(path+" has been added to your path list, see "+configFilename);
      },
      rmPath = function(path) {
        var config = getConfig();
        if(config.paths.indexOf(path) !== -1){
          config.paths.pop(config.paths.indexOf(path));
          setConfig(config);
          console.log(path+" has been removed to your path list, see "+configFilename);
        } else {
          console.log(path+" not found in your paths "+configFilename);
        }
        
      };


  return {
    usages : ["path add <directory> : add a directory","path rm <directory> : rm a directory"],
    
    desc : "Manage path of the sandjs dependencies server",
    
    fn : function(args) {
      if(args[0] === "add"){
        addPath(args[1]);
      } else if (args[0] === "rm"){
        rmPath(args[1]);
      } else {
        console.log("Your paths are :\n\t"+getConfig().paths.join("\n\t"))
      }
    },
    
    getPaths : function() {
      return getConfig().paths;
    }
  };
});
