/**
 * Adds dependency watching to the core fs.watchFile implementation.
 */
var fs = require('fs');

var watchedFiles = {};

function notifyWatch(filename, curr, prev) {
    var watchInfo = watchedFiles[filename];
    if (watchInfo) {
        watchInfo.callbacks.forEach(function(callback) {
            callback(curr, prev);
        });
        watchInfo.parents.forEach(function(parent) {
            notifyWatch(parent, curr, prev);
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
    watchedFiles[filename] = watchInfo;

    fs.watchFile(filename, {interval:50}, function(curr, prev) {
        if (curr.mtime > prev.mtime) {
            notifyWatch(filename, curr, prev);
        }
    });
}

exports.watchFile = function(filename, dependencies, callback) {
    var watch = watchedFiles[filename];
    if (!watch) {
        // Create a watch on this and all others
        watchFile(filename, callback);
    } else {
        if (~~watch.callbacks.indexOf(callback)) {
            watch.callbacks.push(callback);
        }
    }

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

exports.unwatchFile = function(filename, callback) {
    var watchInfo = watchedFiles[filename];
    if (watchInfo) {
        watchInfo.callbacks = watchInfo.callbacks.filter(function(test) {
            return test === callback;
        });
        if (!watchInfo.callbacks.length) {
            fs.unwatchFile(filename);
            delete watchedFiles[filename];
        }
    }
};
