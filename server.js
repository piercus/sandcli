sand.define("sandcli/server", function(r){
  return {
    fn : function() {
      console.log("in server", Array.prototype.slice.call(arguments))
    }
  };
});
