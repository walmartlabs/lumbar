var async = require('async');

module.exports = {
  mode: 'static',
  priority: 1,

  module: function(context, next, complete) {
    next(function(err) {
      async.forEach(context.moduleResources, function(resource, callback) {
          var fileContext = context.clone();
          fileContext.resource = resource;
          var fileInfo = context.loadResource(resource, function(err, data) {
            if (err || !data || !data.content) {
              return callback(err);
            }

            fileContext.outputFile(function(callback) {
              var ret = {
                fileName: fileContext.fileName,
                input: fileInfo.inputs || [ fileInfo.name ],
                module: context.module.name,
                resource: resource
              };

              context.fileUtil.writeFile(fileContext.fileName, data.content, function(err) {
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
