var lib = require('./lib');

describe('integration', function() {
  it('should output a single dir', lib.runTest('test/artifacts/single-directory.json', 'test/expected/js-dir'));
  it('should output multiple files', lib.runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir'));
  it('should output files in multiple modules', lib.runTest('test/artifacts/file-modules.json', 'test/expected/file-modules'));
  it('should handle multiple platforms', lib.runTest('test/artifacts/multiple-platforms.json', 'test/expected/multiple-platforms'));
  it('should handle multiple packages', lib.runTest('test/artifacts/multiple-packages.json', 'test/expected/multiple-packages'));

  it('should output module-map', lib.runTest('test/artifacts/module-map.json', 'test/expected/module-map'));
  it('should output router', lib.runTest('test/artifacts/router.json', 'test/expected/router'));
  it('should output template', lib.runTest('test/artifacts/template.json', 'test/expected/template'));

  // TODO : Templates that are dependent on the platform
  // TODO : Error handling for Missing template cache definitions
  // TODO : Test multiple template references in the same file

  it('should output dev-config', lib.runTest('test/artifacts/package-config.json', 'test/expected/dev-config', {packageConfigFile: 'config/dev.json'}));
  it('should output production-config', lib.runTest('test/artifacts/package-config.json', 'test/expected/production-config', {packageConfigFile: 'config/production.json'}));

  it('should output scope-yield', lib.runTest('test/artifacts/scope-yield.json', 'test/expected/scope-yield'));
  it('should output application-namespace', lib.runTest('test/artifacts/application-namespace.json', 'test/expected/application-namespace', {packageConfigFile: 'config/dev.json'}));

  it('should output styles', lib.runTest('test/artifacts/styles.json', 'test/expected/styles'));
  it('should output stylus', lib.runTest('test/artifacts/stylus.json', 'test/expected/stylus'));
  it('should output inline-styles', lib.runTest('test/artifacts/inline-styles.json', 'test/expected/inline-styles'));

  it('should output trailing-slash', lib.runTest('test/artifacts/trailing-slash.json', 'test/expected/trailing-slash'));

  it('should output static', lib.runTest('test/artifacts/static.json', 'test/expected/static', undefined, '/**/*.*'));
  it('should output index-update', lib.runTest('test/artifacts/index-update.json', 'test/expected/index-update', undefined, '/**/*.{js,css,html}'));
  it('should output generated-load-prefix', lib.runTest('test/artifacts/generated-load-prefix.json', 'test/expected/generated-load-prefix', undefined, '/**/*.{js,css,html}'));
  it('should output json-plugins', lib.runTest('test/artifacts/json-plugins.json', 'test/expected/json-plugin'));
  // TODO : Test file not found and other cases
});
