var fs = require("fs");

sand.define("sandcli/merge", ["sandcli/require"], function(r) {
  var getText = function() {
    r.require.serverDefineMany.apply(this, arguments);  
    var args = Array.prototype.slice.call(arguments),
        l    = args.length,
        options = (typeof(args[l-1]) === "object" ? args[l-1] : {});
    files = r.require.files;
    var text =""; 
    
    for(var i in files) if (files.hasOwnProperty(i)) { 
      try {                        
        if(files[i].wrapper){ 
          // We put the wrappers at the beginning
          text =  fs.readFileSync(r.require.findFile(i, options), "utf8")+"\n"+text;
        } else {
          text += fs.readFileSync(r.require.findFile(i, options), "utf8")+"\n"; 
        }
        //console.log("merged "+i)
      } catch(e){
        console.log("[WARNING] Cannot merge the module "+i, files[i], e);
      }      
    }            
                                                               
    // sand lib is the first thing
    text = fs.readFileSync(r.require.findFile("sandjs/sand"), "utf8") + text;
    return text;
  }
  return {
    fn : function() {
      fs.writeFileSync(r.require.findFile(arguments[0]).split(".")[0] + ".merged.js", getText.apply(this, arguments));
    },
    getText : getText
  };
});
