var assert = require('assert'),
    fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function runTest(configFile, expectedDir, callback) {
  var outdir = '/tmp/lumbar-test-' + Date.now() + Math.random();
  console.log('Creating test directory ' + outdir + ' for ' + configFile);
  fs.mkdirSync(outdir, 0755);

  var arise = lumbar.init(configFile, {outdir: outdir});
  arise.build(undefined, function(err, status) {
    if (err) {
      throw err;
    }

    var generatedFiles = glob.globSync(outdir + '/**/*.js').map(function(fileName) { return fileName.substring(outdir.length); }),
        expectedFiles = glob.globSync(expectedDir + '/**/*.js').map(function(fileName) { return fileName.substring(expectedDir.length); });
    assert.deepEqual(generatedFiles, expectedFiles, configFile + ': file list matches');

    generatedFiles.forEach(function(fileName) {
      var generatedContent = fs.readFileSync(outdir + fileName, 'utf8'),
          expectedContent = fs.readFileSync(expectedDir + fileName, 'utf8');
      assert.equal(generatedContent, expectedContent, configFile + ':' + fileName + ': content matches');
    });

    // Cleanup
    wrench.rmdirSyncRecursive(outdir);
  });
}

exports['single-file'] = function() {
  runTest('test/artifacts/single-file.json', 'test/expected/single-file');
};
exports['single-dir'] = function() {
  runTest('test/artifacts/single-directory.json', 'test/expected/js-dir');
};
exports['multiple-files'] = function() {
  runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir');
};
