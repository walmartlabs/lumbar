/**
 * Static resource management plug-in.  Each module can have a "static" attribute which is an array of
 * resources to be copied from the application path to the build root (or platform root).  Each static
 * entry can be a simple string or a hash containing
 *   - src: the source location (specific file or directory for recursive copy)
 *   - dest: the destination location.
 *   - root: true to copy to build root, false to copy to platform path
 *   - variables: false to not replace #{platform} with the actual platform value.  default is true
 *   - platform: a single platform to execute the copy (optional and mutually exclusive with platforms)
 *   - platforms: an array of platforms to execute the copy (optional and mutually exclusive with platform)
 * 
 * examples:
 * ...
 *   "platforms": ["iphone", "android"],
 *   "modules": {
 *     "foo": {
 *       "static": [
 *         // copy {app}/index.html to {build}/iphone/index.html and {build}/android/index.html
 *         "index.html", 
 *         
 *         // copy {app}/index.html to {build/index.html
 *         "/index.html",
 *         "/static", // copies recursively {app}/static to {build}/static
 *         
 *         // copy {app}/index-iphone.html to {app}/iphone/index.html only for the iphone platform
 *         {"src": "index-iphone.html", "dest": "index.html", "platform": "iphone"}
 *         
 *         // copy recursively {app}/static/iphone to {build}/iphone and {app}/static/android to {build}/android
 *         // will error if any of the platform directories are missing
 *         {"src": "static/#{platform}", "dest": "/#{platform}"}
 *       ]
 *     }
 *   }
 */
var fu = require('../fileUtil'),
    _ = require('underscore'),
    fs = require('fs'),
    rootSlash = /^\//,
    endSlash = /\/$/,
    path = nomarlizeDirName(process.cwd());

module.exports = {
  mode: 'static',

  resource: function(context, next, complete) {
    return handleResource(context.resource, context, complete);
  },

  moduleResources: function(context, next, complete) {
    var _callback = function(err, resources) {
      // perform variable replacement
      if (resources) {
        // we need to deep copy the resources in case we make variable changes
        resources = JSON.parse(JSON.stringify(resources));
        _.each(resources, function(res, index) {
          var r = resources[index];
          if (_.isString(r)) {
            r = replaceVariables(resources[index], context);
          } else if (r.variables !== false) {
            r.src = r.src && replaceVariables(r.src, context);
            r.dest = r.dest && replaceVariables(r.dest, context);
          }
          resources[index] = r;
        });
      }

      complete(err, resources);
    }

    next(_callback);
  }
};

/*
 * Program logic for a static resource entry
 */
function handleResource(r, context, callback) {
  if (context.config.filterResource(r, context)) {
    var src = _.isString(r) ? r : r.src,
        dir = r.dir,
        srcDir = r.srcDir,
        dest = r.dest || src,
        outputRoot = !!r.root;
  
    if (src) {
      // normalize the paths
      src = src.replace(rootSlash, '');
      dest = dest.replace(rootSlash, '');

      if (!outputRoot) {
        // prefix with the platform path
        dest = nomarlizeDirName(context.platformPath) + dest;
      }
      // prefix with the output path
      dest = nomarlizeDirName(context.options.outdir) + dest;
      if (srcDir) {
        srcDir = srcDir.replace(rootSlash, '');
        // srcDir is some prefix of src - we want to append the remaining part or src to dest
        var destFilePath = src.substring(srcDir.length + 1);
        dest = nomarlizeDirName(dest) + destFilePath;
      }

      console.log('Copying file ' + src + ' to ' + dest);
      fu.copyFile(src, dest, function(err) {
        if (err) {
          callback("Could not copy " + src + ": " + err);
        } else {
          callback();
        }
      });
    } else if (dir) {
      // it's a directory, lumbar will make resource calls for the files automatically
      callback();
    } else {
      console.log("No src attribute for static '" + JSON.stringify(r) + "'");
      callback("No src attribute for static '" + JSON.stringify(r) + "'");
    }
  }
}

/*
 * Replace variables with actual values
 */
function replaceVariables(str, context) {
  return str.replace(/\#{platform}/, context.platform);
}

/*
 * Make sure the directory name has a trailing slash
 */
function nomarlizeDirName(dirName) {
  if (dirName.match(endSlash)) {
    return dirName;
  }
  return dirName + '/';
}
