var assert = require('assert'),
    fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../../lib/lumbar'),
    path = require('path'),
    wrench = require('wrench');

var counter = 0;
try { fs.mkdirSync('/tmp/lumbar-test', 0755); } catch (err) {}

exports.testDir = function(testName, configFile) {
  var outdir = '/tmp/lumbar-test/' + testName + '-' + path.basename(configFile) + '-' + Date.now() + '-' + (counter++);
  fs.mkdirSync(outdir, 0755);
  return outdir;
};
exports.assertExpected = function(outdir, expectedDir, configFile) {
  var expectedFiles = glob.sync(expectedDir + '/**/*.*').map(function(fileName) {
        return fileName.substring(expectedDir.length);
      }).filter(function(file) { return !/\/$/.test(file); }).sort(),
      generatedFiles = glob.sync(outdir + '/**/*.*').map(function(fileName) {
        return fileName.substring(outdir.length);
      }).filter(function(file) { return !/\/$/.test(file); }).sort();
  assert.deepEqual(generatedFiles, expectedFiles, configFile + ': file list matches' + JSON.stringify(expectedFiles) + JSON.stringify(generatedFiles));

  generatedFiles.forEach(function(fileName) {
    var generatedStat = fs.statSync(outdir + fileName),
        expectedStat = fs.statSync(expectedDir + fileName);

    assert.equal(generatedStat.isFile(), expectedStat.isFile());
    assert.equal(generatedStat.isDirectory(), expectedStat.isDirectory());

    if (generatedStat.isDirectory()) {
      return;
    }

    var generatedContent = fs.readFileSync(outdir + fileName, 'utf8'),
        expectedContent = fs.readFileSync(expectedDir + fileName, 'utf8');
    assert.equal(generatedContent, expectedContent, configFile + ':' + fileName + ': content matches');
  });
};

exports.runTest = function(configFile, expectedDir, options, expectGlob) {
  return function(done) {
    var outdir = exports.testDir('lumbar', configFile);
    this.title += ' ' + outdir;

    options = options || {};
    options.outdir = outdir;

    var expectedFiles = glob.sync(expectedDir + (expectGlob || '/**/*.{js,css}')).map(function(fileName) {
          return fileName.substring(expectedDir.length);
        }).sort(),
        seenFiles = [];

    var arise = lumbar.init(configFile, options || {outdir: outdir});
    arise.on('output', function(status) {
      if (retCount > 0) {
        throw new Error('Output event seen after callback');
      }

      var statusFile = status.fileName.substring(outdir.length);
      if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
        assert.fail(undefined, status.fileName, configFile + ':' + statusFile + ': missing from expected list');
      } else {
        seenFiles.push(statusFile);
      }
      if (seenFiles.length < expectedFiles.length) {
        return;
      }

      exports.assertExpected(outdir, expectedDir, configFile);

      seenFiles = seenFiles.sort();
      assert.deepEqual(seenFiles, expectedFiles, 'seen file list matches');

      // Cleanup (Do cleanup here so the files remain for the failure case)
      wrench.rmdirSyncRecursive(outdir);

      done();
    });
    var retCount = 0;
    arise.build(undefined, function(err) {
      retCount++;
      if (retCount > 1) {
        throw new Error('Build callback executed multiple times');
      }
      if (err) {
        throw err;
      }
    });
  };
}
