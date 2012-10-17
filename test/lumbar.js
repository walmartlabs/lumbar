var lib = require('./lib');

describe('file output', function() {
  it('should output a single dir', lib.runTest('test/artifacts/single-directory.json', 'test/expected/js-dir'));
  it('should output multiple files', lib.runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir'));
  it('should output files in multiple modules', lib.runTest('test/artifacts/file-modules.json', 'test/expected/file-modules'));
  it('should handle multiple platforms', lib.runTest('test/artifacts/multiple-platforms.json', 'test/expected/multiple-platforms'));
  it('should handle multiple packages', lib.runTest('test/artifacts/multiple-packages.json', 'test/expected/multiple-packages'));

  it('should output styles', lib.runTest('test/artifacts/styles.json', 'test/expected/styles'));
  it('should output static', lib.runTest('test/artifacts/static.json', 'test/expected/static', undefined, '/**/*.*'));
});

describe('integration', function() {
  it('should output stylus', lib.runTest('test/artifacts/stylus.json', 'test/expected/stylus'));
  it('should output inline-styles', lib.runTest('test/artifacts/inline-styles.json', 'test/expected/inline-styles'));
  it('should output module-map', lib.runTest('test/artifacts/module-map.json', 'test/expected/module-map'));

  // TODO : Error handling for Missing template cache definitions
  it('should output application-namespace', lib.runTest('test/artifacts/application-namespace.json', 'test/expected/application-namespace', {packageConfigFile: 'config/dev.json'}));

  it('should output index-update', lib.runTest('test/artifacts/index-update.json', 'test/expected/index-update', undefined, '/**/*.{js,css,html}'));
  it('should output generated-load-prefix', lib.runTest('test/artifacts/generated-load-prefix.json', 'test/expected/generated-load-prefix', undefined, '/**/*.{js,css,html}'));
  it('should output json-plugins', lib.runTest('test/artifacts/json-plugins.json', 'test/expected/json-plugin'));
  // TODO : Test file not found and other cases
});
