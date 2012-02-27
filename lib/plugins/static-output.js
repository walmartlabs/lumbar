var async = require('async');

module.exports = {
  mode: 'static',
  priority: 1,

  module: function(context, next, complete) {
    next(function(err) {
      async.forEach(context.moduleResources, function(resource, callback) {
          var fileContext = context.clone();
          fileContext.resource = resource;

          // Filter out dir entries
          if (resource.dir) {
            return callback();
          }

          fileContext.outputFile(function(callback) {
            var fileInfo = fileContext.loadResource(resource, function(err, data) {
              if (err || !data || !data.content) {
                return callback(err);
              }

              var ret = {
                fileName: fileContext.fileName,
                input: fileInfo.inputs || [ fileInfo.name ],
                module: context.module.name,
                resource: resource
              };

              context.fileUtil.writeFile(fileContext.fileName, data.content, function(err) {
                if (err) {
                  err = new Error('Static output "' + fileContext.fileName + '" failed\n\t' + err);
                }

                callback(err, ret);
              });
            });
          },
          callback);
        },
        complete);
    });
  }
};
