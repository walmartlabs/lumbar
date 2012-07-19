var lib = require('./lib');

exports['single-file'] = lib.runTest('test/artifacts/single-file.json', 'test/expected/single-file');
exports['single-dir'] = lib.runTest('test/artifacts/single-directory.json', 'test/expected/js-dir');
exports['multiple-files'] = lib.runTest('test/artifacts/multiple-files.json', 'test/expected/js-dir');
exports['file-modules'] = lib.runTest('test/artifacts/file-modules.json', 'test/expected/file-modules');
exports['multiple-platforms'] = lib.runTest('test/artifacts/multiple-platforms.json', 'test/expected/multiple-platforms');
exports['multiple-packages'] = lib.runTest('test/artifacts/multiple-packages.json', 'test/expected/multiple-packages');

exports['module-map'] = lib.runTest('test/artifacts/module-map.json', 'test/expected/module-map');
exports['router'] = lib.runTest('test/artifacts/router.json', 'test/expected/router');
exports['template'] = lib.runTest('test/artifacts/template.json', 'test/expected/template');

// TODO : Templates that are dependent on the platform
// TODO : Error handling for Missing template cache definitions
// TODO : Test multiple template references in the same file

exports['dev-config'] = lib.runTest('test/artifacts/package-config.json', 'test/expected/dev-config', {packageConfigFile: 'config/dev.json'});
exports['production-config'] = lib.runTest('test/artifacts/package-config.json', 'test/expected/production-config', {packageConfigFile: 'config/production.json'});

exports['scope-resource'] = lib.runTest('test/artifacts/scope-resource.json', 'test/expected/scope-resource');
exports['scope-none'] = lib.runTest('test/artifacts/scope-none.json', 'test/expected/scope-none');
exports['scope-globals'] = lib.runTest('test/artifacts/scope-globals.json', 'test/expected/scope-globals');
exports['scope-yield'] = lib.runTest('test/artifacts/scope-yield.json', 'test/expected/scope-yield');
exports['application-namespace'] = lib.runTest('test/artifacts/application-namespace.json', 'test/expected/application-namespace', {packageConfigFile: 'config/dev.json'});

exports['styles'] = lib.runTest('test/artifacts/styles.json', 'test/expected/styles');
exports['stylus'] = lib.runTest('test/artifacts/stylus.json', 'test/expected/stylus');
exports['inline-styles'] = lib.runTest('test/artifacts/inline-styles.json', 'test/expected/inline-styles');

exports['trailing-slash'] = lib.runTest('test/artifacts/trailing-slash.json', 'test/expected/trailing-slash');

exports['static'] = lib.runTest('test/artifacts/static.json', 'test/expected/static', undefined, '/**/*.*');
exports['index-update'] = lib.runTest('test/artifacts/index-update.json', 'test/expected/index-update', undefined, '/**/*.{js,css,html}');
exports['generated-load-prefix'] = lib.runTest('test/artifacts/generated-load-prefix.json', 'test/expected/generated-load-prefix', undefined, '/**/*.{js,css,html}');
exports['json-plugins'] = lib.runTest('test/artifacts/json-plugins.json', 'test/expected/json-plugin');
// TODO : Test file not found and other cases
