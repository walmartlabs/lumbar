var fs = require('fs'),
    glob = require('glob'),
    lib = require('./lib'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function appendSpace(path) {
  setTimeout(function() {
    console.error('append:', path);
    var fd = fs.openSync(path, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 1000);
}
function appendRapidSpace(path1, path2) {
  setTimeout(function() {
    console.error('append rapid:', path1, path2);
    var fd = fs.openSync(path1, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);

    var fd = fs.openSync(path2, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 1000);
}

exports['watch-file'] = function(beforeExit, assert) {
  var srcdir = lib.testDir('watch-file', 'example'),
      outdir = lib.testDir('watch-file', 'test');
  wrench.copyDirSyncRecursive('example', srcdir);

  var expectedDir = 'test/expected/example',
      expectedFiles = [
          '/android/native-home.js', '/iphone/native-home.js', '/web/base.js', '/web/home.js',
          '/android/native-home.js', '/iphone/native-home.js', '/web/base.js', '/web/home.js',
          '/android/native-home.js', '/iphone/native-home.js',
          '/android/native-home.js', '/iphone/native-home.js',
          '/android/native-home.js', '/iphone/native-home.js', '/web/home.js'
        ],
      operations = {
        4: function() {
          // Modify the config file
          appendSpace(srcdir + '/lumbar.json');
        },
        8: function() {
          // Modify the bridge file
          appendSpace(srcdir + '/js/bridge.js');
        },
        10: function() {
          appendRapidSpace(srcdir + '/js/bridge.js', srcdir + '/js/bridge-iphone.js');
        },
        12: function() {
          // Modify the home template
          appendSpace(srcdir + '/templates/home.handlebars');
        }
      },
      seenFiles = [];

  var arise = lumbar.init(srcdir + '/lumbar.json', {packageConfigFile: 'config/dev.json', outdir: outdir});
  arise.watch(undefined, function(err, status) {
    if (err) {
      throw err;
    }

    var statusFile = status.fileName.substring(outdir.length);
    console.error(statusFile);
    if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
      arise.unwatch();
      assert.fail(undefined, status.fileName,  'watchFile:' + statusFile + ': missing from expected list');
    } else {
      seenFiles.push(statusFile);
    }
    operations[seenFiles.length] && operations[seenFiles.length]();
    if (seenFiles.length < expectedFiles.length) {
      return;
    }

    arise.unwatch();

    lib.assertExpected(outdir, expectedDir, 'watchfile', assert);

    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(srcdir);
    wrench.rmdirSyncRecursive(outdir);
  });

  beforeExit(function() {
    seenFiles = seenFiles.sort();
    expectedFiles = expectedFiles.sort();
    assert.deepEqual(seenFiles, expectedFiles, 'watchFile: seen file list matches');
  });
};
