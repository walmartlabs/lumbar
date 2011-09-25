var fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function runTest(configFile, expectedDir, options, beforeExit, assert) {
  var outdir = '/tmp/lumbar-test/test-' + Date.now() + Math.random();
  console.log('Creating test directory ' + outdir + ' for ' + configFile);
  fs.mkdirSync(outdir, 0755);

  if (typeof options === 'function') {
    assert = beforeExit;
    beforeExit = options;
    options = undefined;
  } else {
    options.outdir = outdir;
  }

  var expectedFiles = glob.globSync(expectedDir + '/**/*.js').map(function(fileName) { return fileName.substring(expectedDir.length); }),
      seenFiles = [];

  var arise = lumbar.init(configFile, options || {outdir: outdir});
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
    seenFiles = seenFiles.sort();
    assert.deepEqual(seenFiles, expectedFiles, configFile + ': seen file list matches');
  });
}

try { fs.mkdirSync('/tmp/lumbar-test', 0755); } catch (err) {}

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
exports['multiple-packages'] = function(beforeExit, assert) {
  runTest('test/artifacts/multiple-packages.json', 'test/expected/multiple-packages', beforeExit, assert);
};

exports['module-map'] = function(beforeExit, assert) {
  runTest('test/artifacts/module-map.json', 'test/expected/module-map', beforeExit, assert);
};
exports['router'] = function(beforeExit, assert) {
  runTest('test/artifacts/router.json', 'test/expected/router', beforeExit, assert);
};
exports['template'] = function(beforeExit, assert) {
  runTest('test/artifacts/template.json', 'test/expected/template', beforeExit, assert);
};

// TODO : Templates that are dependent on the platform
// TODO : Error handling for Missing template cache definitions
// TODO : Test multiple template references in the same file

exports['dev-config'] = function(beforeExit, assert) {
  runTest('test/artifacts/package-config.json', 'test/expected/dev-config', {packageConfigFile: 'config/dev.json'}, beforeExit, assert);
};
exports['production-config'] = function(beforeExit, assert) {
  runTest('test/artifacts/package-config.json', 'test/expected/production-config', {packageConfigFile: 'config/production.json'}, beforeExit, assert);
};

// TODO : Test file not found and other cases
