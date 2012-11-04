var fs = require("fs");
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;

sand.define("sandcli/min", ["sandcli/require", "sandcli/merge"], function(r) {
  return {
    fn : function() {
      var text = r.merge.getText.apply(this, arguments);
      var ast = jsp.parse(text); // parse code and get the initial AST
      ast = pro.ast_mangle(ast); // get a new AST with mangled names
      ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
      var final_code = pro.gen_code(ast); // compressed code here      
      
      fs.writeFileSync(r.require.findFile(arguments[0]).split(".")[0] + ".min.js", final_code);
    }
  };
});
