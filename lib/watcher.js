/**
 * Adds dependency watching to the core fs.watchFile implementation.
 */
var _ = require('underscore'),
    fs = require('fs');

var watchedFiles = {};

function notifyWatch(filename, type, sourceChange, trigger) {
  var watchInfo = watchedFiles[filename];
  if (watchInfo) {
    var inQueue = _.find(watchInfo.queue, function(entry) {
      return entry.type === type
          && entry.filename === filename
          && entry.sourceChange === sourceChange;
    });

    if (!inQueue) {
      var entry = {type: type, filename: filename, sourceChange: sourceChange};
      watchInfo.queue.push(entry);

      function exec() {
        watchInfo.queue = _.without(watchInfo.queue, entry);

        if (watchInfo.callback) {
          watchInfo.callback(type, filename, sourceChange);
        }
        watchInfo.parents.forEach(function(parent) {
          notifyWatch(parent, type, sourceChange, trigger);
        });
      }

      if (trigger) {
        exec();
      } else {
        // Debounce so we don't output multiple instances of the same event on platforms
        // such as linux that may send multiple events on write, etc.
        _.defer(exec, 200);
      }
    }
  }
}

function watchFile(filename, callback, parent) {
    var watchInfo = {
      callback: callback,
      parents: [],
      queue: []
    };
    if (parent) {
      watchInfo.parents.push(parent);
    }
    watchedFiles[filename.virtual || filename] = watchInfo;

    if (!filename.virtual) {
      var hasRetried;

      (function watch(ignoreError) {
        try {
          var oldStat = fs.statSync(filename),
              lastType,
              rewatch;

          var changeHandler = _.debounce(function() {
            if (rewatch) {
              // Attempt to reattach on rename
              watchInfo.watch.close();
              watch(true);
            }
            notifyWatch(filename, lastType, filename);
          }, 1000);

          watchInfo.watch = fs.watch(filename, function(type) {
            try {
              var newStat = fs.statSync(filename);
              if (newStat.isDirectory()) {
                notifyWatch(filename, 'create', filename);
              } else if (newStat.size !== oldStat.size || newStat.mtime.getTime() > oldStat.mtime.getTime()) {
                oldStat = newStat;
                if (type === 'rename') {
                  rewatch = true;
                }
                lastType = type;
                changeHandler();
              }
            } catch (err) {
              if (err.code === 'ENOENT') {
                // The file was removed by the time we got to it. This could be a case of it actually being removed
                // or a race condtion with rewriting APIs.
                watchInfo.watch.close();

                // Pause a bit to see if this was a replace that we raced with...
                setTimeout(function() {
                  try {
                    fs.statSync(filename);    // No exception: file still exists, notify and restart the watch
                    notifyWatch(filename, 'change', filename);
                    watch(true);
                  } catch (err) {
                    // The file is really gone... or we just got hit with a race condtion twice. Give up.
                    notifyWatch(filename, 'remove', filename);
                  }
                }, 500);
              } else {
                throw err;
              }
            }
          });
        } catch (err) {
          if (!hasRetried && err.code === 'EMFILE') {
            hasRetried = true;
            setTimeout(function() {
              watch(ignoreError);
            }, 250);
          } else if (!ignoreError) {
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
    watch.callback = callback;
  }

  filename = filename.virtual || filename;

  dependencies.forEach(function(depend) {
    var watch = watchedFiles[depend.virtual || depend];
    if (!watch) {
      watchFile(depend, undefined, filename);
    } else {
      if (!_.contains(watch.parents, filename)) {
        watch.parents.push(filename);
      }
    }
  });
};

exports.trigger = function(type, filename) {
  notifyWatch(filename, type, filename, true);
};

exports.unwatch = function(filename, dependencies) {
  var watch = watchedFiles[filename.virtual || filename];
  if (!watch) {
    return;
  }

  // Remove the callback
  if (!dependencies) {
    watch.callback = undefined;
  }

  // For each dependency remove the parent link
  filename = filename.virtual || filename;

  _.each(dependencies || watchedFiles, function(depend) {
    var watch = watchedFiles[depend.virtual || depend];
    if (!watch) {
      return;
    }

    watch.parents = _.without(watch.parents, filename);
  });

  // Kill this watch if it can't trigger or fire
  var canTrigger = watch.watch || _.some(watchedFiles, function(watch) {
    return _.contains(watch.parents, filename);
  });
  if (!watch.callback || !canTrigger) {
    unwatch(filename);
  }

  // Kill any other watches that might not be valid anymore
  _.each(_.clone(watchedFiles), function(watch, name) {
    if (!watch.callback && !watch.parents.length) {
      exports.unwatch(name);
    }
  });
};
exports.unwatchAll = function() {
  _.each(watchedFiles, function(watch, name) {
    unwatch(name);
  });
};

function unwatch(name) {
  watchedFiles[name].callback = undefined;
  if (watchedFiles[name].watch) {
    watchedFiles[name].watch.close();
  }
  delete watchedFiles[name];
}
