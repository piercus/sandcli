sand.define("sandcli/help", [], function(r){
  
  return {
    fn : function(args, opts) {
      if(!args[0]) {
      
        console.log([
            "",
            "sandcli provides a command-line interface to sandjs modules",
            "",
            "Usage:",
            "  sand <command> <options>",
            "",
            "The most commonly used sand commands are:",
            "  require   Require and execute a sandjs module (default command)",
            "  path      Manage path of the sandjs dependencies server ",
            ""].join("\n"));
      
      } else if (args[0]) {
        try {
          var m = sand.require("sandcli/"+args[0]);

          console.log(
          "\n"+args[0]+" : "+m.desc+"\n\n"+
          "Usage :\n"+m.usages.map(function(u){
            return "  sand "+u;
          }).join("\n")+"\n")
        } catch (e) {
          console.log("command "+args[0]+" not found");
        }
        
      }
      
    }
  };
});
