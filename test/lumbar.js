var fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function runTest(configFile, expectedDir, beforeExit, assert) {
  var outdir = '/tmp/lumbar-test/test-' + Date.now() + Math.random();
  console.log('Creating test directory ' + outdir + ' for ' + configFile);
  fs.mkdirSync(outdir, 0755);

  var expectedFiles = glob.globSync(expectedDir + '/**/*.js').map(function(fileName) { return fileName.substring(expectedDir.length); }),
      seenFiles = [];

  var arise = lumbar.init(configFile, {outdir: outdir});
  arise.build(undefined, function(err, status) {
    if (err) {
      throw err;
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

    var generatedFiles = glob.globSync(outdir + '/**/*.js').map(function(fileName) { return fileName.substring(outdir.length); });
    assert.deepEqual(generatedFiles, expectedFiles, configFile + ': file list matches');

    generatedFiles.forEach(function(fileName) {
      var generatedContent = fs.readFileSync(outdir + fileName, 'utf8'),
          expectedContent = fs.readFileSync(expectedDir + fileName, 'utf8');
      assert.equal(generatedContent, expectedContent, configFile + ':' + fileName + ': content matches');
    });

    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(outdir);
  });

  beforeExit(function() {
    assert.deepEqual(seenFiles, expectedFiles, configFile + ': seen file list matches');
  });
}

fs.mkdirSync('/tmp/lumbar-test', 0755);

exports['single-file'] = function(beforeExit, assert) {
  runTest('test/artifacts/single-file.json', 'test/expected/single-file', beforeExit, assert);
};
exports['single-dir'] = function(beforeExit, assert) {
  runTest('test/artifacts/single-directory.json', 'test/expected/js-dir', beforeExit, assert);
};
exports['multiple-files'] = function(beforeExit, assert) {
  runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir', beforeExit, assert);
};
exports['file-modules'] = function(beforeExit, assert) {
  runTest('test/artifacts/file-modules.json', 'test/expected/file-modules', beforeExit, assert);
};
exports['multiple-platforms'] = function(beforeExit, assert) {
  runTest('test/artifacts/multiple-platforms.json', 'test/expected/multiple-platforms', beforeExit, assert);
};
