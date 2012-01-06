var async = require('async'),
    fu = require('../fileUtil');

module.exports = {  
  mode: 'static',  

  module: function(context, next, complete) {
    next(function(err) {
      async.forEach(context.moduleResources, function(resource, callback) {
          var fileContext = context.clone();
          fileContext.resource = resource;
          var fileInfo = fu.loadResource(resource, function(err, data) {
            if (err || !data || !data.content) {
              return callback(err);
            }

            fileContext.outputFile(function(callback) {
              var ret = {
                fileName: fileContext.fileName,
                inputs: fileInfo.inputs || [ fileInfo.name ],
                fileConfig: context.fileConfig,
                platform: context.platform,
                package: context.package,
                mode: context.mode
              };

              fu.writeFile(fileContext.fileName, data.content, function(err) {
                callback(err, ret);
              });
            },
            callback);
          });
        },
        complete);
    });
  }
};
