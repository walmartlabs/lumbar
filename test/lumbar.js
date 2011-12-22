var assert = require('assert'),
    fs = require('fs'),
    glob = require('glob'),
    lib = require('./lib'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function runTest(configFile, expectedDir, options) {
  return function(done) {
    var outdir = lib.testDir('lumbar', configFile);

    options = options || {};
    options.outdir = outdir;

    var expectedFiles = glob.globSync(expectedDir + '/**/*.{css,js}').map(function(fileName) { return fileName.substring(expectedDir.length); }),
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

      lib.assertExpected(outdir, expectedDir, configFile);

      seenFiles = seenFiles.sort();
      assert.deepEqual(seenFiles, expectedFiles, configFile + ': seen file list matches');

      // Cleanup (Do cleanup here so the files remain for the failure case)
      wrench.rmdirSyncRecursive(outdir);

      done();
    });
  };
}

exports['single-file'] = runTest('test/artifacts/single-file.json', 'test/expected/single-file');
exports['single-dir'] = runTest('test/artifacts/single-directory.json', 'test/expected/js-dir');
exports['multiple-files'] = runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir');
exports['file-modules'] = runTest('test/artifacts/file-modules.json', 'test/expected/file-modules');
exports['multiple-platforms'] = runTest('test/artifacts/multiple-platforms.json', 'test/expected/multiple-platforms');
exports['multiple-packages'] = runTest('test/artifacts/multiple-packages.json', 'test/expected/multiple-packages');

exports['module-map'] = runTest('test/artifacts/module-map.json', 'test/expected/module-map');
exports['router'] = runTest('test/artifacts/router.json', 'test/expected/router');
exports['template'] = runTest('test/artifacts/template.json', 'test/expected/template');

// TODO : Templates that are dependent on the platform
// TODO : Error handling for Missing template cache definitions
// TODO : Test multiple template references in the same file

exports['dev-config'] = runTest('test/artifacts/package-config.json', 'test/expected/dev-config', {packageConfigFile: 'config/dev.json'});
exports['production-config'] = runTest('test/artifacts/package-config.json', 'test/expected/production-config', {packageConfigFile: 'config/production.json'});

exports['scope-resource'] = runTest('test/artifacts/scope-resource.json', 'test/expected/scope-resource');
exports['scope-none'] = runTest('test/artifacts/scope-none.json', 'test/expected/scope-none');
exports['scope-globals'] = runTest('test/artifacts/scope-globals.json', 'test/expected/scope-globals');
exports['application-namespace'] = runTest('test/artifacts/application-namespace.json', 'test/expected/application-namespace', {packageConfigFile: 'config/dev.json'});

exports['styles'] = runTest('test/artifacts/styles.json', 'test/expected/styles');
exports['stylus'] = runTest('test/artifacts/stylus.json', 'test/expected/stylus');
exports['style-map'] = runTest('test/artifacts/style-map.json', 'test/expected/style-map');

// TODO : Test file not found and other cases
