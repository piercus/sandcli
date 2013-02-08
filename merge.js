var fs = require("fs");

sand.define("sandcli/merge", ["sandcli/require"], function(r) {
  var getText = function() {
    r.require.serverDefineMany.apply(this, arguments);  
    var args = Array.prototype.slice.call(arguments),
        l    = args.length,
        options = (typeof(args[l-1]) === "object" ? args[l-1] : {});
    files = r.require.files;
    var text = fs.readFileSync(r.require.findFile("sandjs/sand"), "utf8");
    
    for(var i in files) if (files.hasOwnProperty(i)) {
      text += fs.readFileSync(r.require.findFile(i, options), "utf8")+"\n";
    }
    return text;
  }
  return {
    fn : function() {
      fs.writeFileSync(r.require.findFile(arguments[0]).split(".")[0] + ".merged.js", getText.apply(this, arguments));
    },
    getText : getText
  };
});
