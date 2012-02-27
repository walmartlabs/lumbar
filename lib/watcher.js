/**
 * Adds dependency watching to the core fs.watchFile implementation.
 */
var fs = require('fs');

var watchedFiles = {};

function notifyWatch(filename, type, sourceChange) {
    var watchInfo = watchedFiles[filename];
    if (watchInfo) {
        watchInfo.callbacks.forEach(function(callback) {
          callback(type, filename, sourceChange);
        });
        watchInfo.parents.forEach(function(parent) {
          notifyWatch(parent, type, sourceChange);
        });
    }
}

function watchFile(filename, callback, parent) {
    var watchInfo = {
        callbacks: [],
        parents: []
    };
    if (callback) {
        watchInfo.callbacks.push(callback);
    }
    if (parent) {
        watchInfo.parents.push(parent);
    }
    watchedFiles[filename.virtual || filename] = watchInfo;

    if (!filename.virtual) {
      var hasRetried;

      (function watch() {
        try {
          var oldStat = fs.statSync(filename);
          watchInfo.watch = fs.watch(filename, function(type) {
            try {
              var newStat = fs.statSync(filename);
              if (newStat.size !== oldStat.size || newStat.mtime.getTime() > oldStat.mtime.getTime()) {
                oldStat = newStat;
                notifyWatch(filename, type, filename);
              }
            } catch (err) {
              if (err.code === 'ENOENT') {
                notifyWatch(filename, 'remove', filename);
                watchInfo.watch.close();
              } else {
                throw err;
              }
            }
          });
        } catch (err) {
          if (!hasRetried && err.code === 'EMFILE') {
            hasRetried = true;
            setTimeout(watch, 250);
          } else {
            throw err;
          }
        }
      })();
    }
}

exports.watchFile = function(filename, dependencies, callback) {
    var watch = watchedFiles[filename.virtual || filename];
    if (!watch) {
        // Create a watch on this and all others
        watchFile(filename, callback);
    } else {
        if (~~watch.callbacks.indexOf(callback)) {
            watch.callbacks.push(callback);
        }
    }

    filename = filename.virtual || filename;

    dependencies.forEach(function(depend) {
        var watch = watchedFiles[depend];
        if (!watch) {
            watchFile(depend, undefined, filename);
        } else {
            if (~~watch.parents.indexOf(filename)) {
                watch.parents.push(filename);
            }
        }
    });
};

exports.unwatchAll = function() {
    for (var name in watchedFiles) {
        if (watchedFiles[name].watch) {
          watchedFiles[name].watch.close();
        }
        delete watchedFiles[name];
    }
};
