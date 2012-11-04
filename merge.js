var fs = require("fs");

sand.define("sandcli/merge", ["sandcli/require"], function(r) {
  var getText = function() {
    r.require.fn.apply(this, arguments);
    files = r.require.files;
    
    var text = fs.readFileSync(r.require.findFile("sandjs/sand"), "utf8");
    
    for(var i in files) if (files.hasOwnProperty(i)) {
      text += fs.readFileSync(r.require.findFile(i), "utf8")+"\n";
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
