var assert = require('assert'),
    fs = require('fs'),
    lib = require('./index'),
    lumbar = require('../../lib/lumbar'),
    wrench = require('wrench');

exports.canWatch = function() {
  // Watch is unsupported on 0.4 and earlier
  return !!fs.watch;
};

exports.append = function(path, content) {
  setTimeout(function() {
    var fd = fs.openSync(path, 'a');
    fs.writeSync(fd, content);
    fs.closeSync(fd);
  }, 500);
};
exports.appendSpace = function(path) {
  exports.append(path, ' ');
};

exports.appendRapidSpace = function(path1, path2) {
  setTimeout(function() {
    var fd = fs.openSync(path1, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);

    var fd = fs.openSync(path2, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 500);
};

exports.runWatchTest = function(srcdir, config, operations, expectedFiles, options, done) {
  var title = this.title || config,
      testdir = lib.testDir(title, 'example'),
      outdir = lib.testDir(title, 'test'),
      seenFiles = [];
  if (this.title) {
    this.title += ' ' + outdir;
  }

  wrench.copyDirSyncRecursive(srcdir, testdir);

  function complete(err) {
    process.removeListener('uncaughtException', complete);
    done();
  }
  process.on('uncaughtException', complete);

  options.outdir = outdir;
  var arise = lumbar.init(testdir + '/' + config, options);
  arise.on('output', function(status) {
    var statusFile = status.fileName.substring(outdir.length);
    if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
      arise.unwatch();
      assert.fail(undefined, status.fileName,  'watchFile:' + statusFile + ': missing from expected list');
    } else {
      seenFiles.push(statusFile);
    }
    var seen = seenFiles.length;
    setTimeout(function() {
      operations[seen] && operations[seen](testdir);
    }, 0);
    if (seenFiles.length < expectedFiles.length) {
      return;
    }

    arise.unwatch();

    seenFiles = seenFiles.sort();
    expectedFiles = expectedFiles.sort();
    assert.deepEqual(seenFiles, expectedFiles, 'watchFile: seen file list matches');

    if (options.expectedDir) {
      lib.assertExpected(outdir, options.expectedDir, 'watchfile: ' + outdir);
    }

    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(testdir);
    wrench.rmdirSyncRecursive(outdir);

    complete();
  });

  var retCount = 0;
  arise.watch(undefined, function(err) {
    err = err || new Error('Callback called without fatal error');
    throw err;
  });
};
