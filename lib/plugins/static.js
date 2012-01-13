var _ = require('underscore');

/*
 * Replace variables with actual values
 */
function replaceVariables(str, context) {
  return str.replace(/\#{platform}/, context.platform);
}

/*
 * Make sure the directory name has a trailing slash
 */
function normalizeDirName(dirName) {
  if (dirName.match(/\/$/)) {
    return dirName;
  }
  return dirName + '/';
}

module.exports = {
  mode: 'static',
  priority: 99,

  fileName: function(context, next, complete) {
    var resource = context.resource,
        src = resource.src || resource.sourceFile,
        dir = resource.dir;

    var root = '';

    if (resource.srcDir && resource.dest) {
      // srcDir is some prefix of src - we want to append the remaining part or src to dest
      src = src.substring(resource.srcDir.length + 1);
      root += normalizeDirName(resource.dest);
    } else if (resource.dest) {
      src = resource.dest;
    }

    root = replaceVariables(root, context);
    src = replaceVariables(src, context);

    var components = /(.*?)(?:\.([^.]+))?$/.exec(src);
    complete(undefined, {root: resource.root, path: root + components[1], extension: components[2]});
  },

  resource: function(context, next, complete) {
    next(function(err, resource) {
      if (_.isString(resource)) {
        resource = replaceVariables(resource, context);
      } else if (resource.src) {
        resource.src = replaceVariables(resource.src, context);
      }
      complete(undefined, resource);
    });
  }
};
