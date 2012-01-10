var fu = require('../../lib/fileUtil');

module.exports = function(options) {

  return {
    mode: 'foo',
    
    module: function(context, next, complete) {
      if (context.configCache.pluginTest) {
        return next(complete);
      }

      context.configCache.pluginTest = true;
      next(function(err) {
        var outdir = context.options.outdir;
        var fileName = options.fileName;
        fileName = outdir += '/' + fileName;
        var content = options.content;
          
        fu.writeFile(fileName, content, function() {
          context.event.emit('output', {fileName: fileName});
          complete();
        });
      });
    }
  }
}