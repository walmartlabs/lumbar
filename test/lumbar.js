var _ = require('underscore'),
    lib = require('./lib'),
    lumbar = require('../lib/lumbar'),
    stateMachine = require('../lib/state-machine');

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
  it('should output json-plugins', lib.runTest('test/artifacts/json-plugins.json', 'test/expected/json-plugin'));
  // TODO : Test file not found and other cases
});

describe('#moduleMap', function() {
  var arise;
  beforeEach(function() {
    arise = lumbar.init({
      platforms: ['web', 'webview'],
      packages: {
        map: true,
        store: {
          platforms: ['web'],
          modules: ['foo']
        }
      },
      modules: {
        'foo': {
          routes: {
            'bat/:baz': 'bat',
            'foo': 'bar'
          }
        },
        'bar': {
          routes: {
            'bar/bat/:baz': 'bat',
            'bar/foo': 'bar'
          }
        }
      },
      loadPrefix: 'prefix!'
    }, {});
  });

  it('should collect map', function(done) {
    arise.moduleMap(function(err, map) {
      map.should.eql({
        "map": {
          "web": {
            "isMap": true,
            "loadPrefix": "prefix!web/",
            "modules": {
              "foo": {
                "js": "foo.js",
                "css": undefined
              },
              "bar": {
                "js": "bar.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo",
              "bar/bat/:baz": "bar",
              "bar/foo": "bar"
            }
          },
          "webview": {
            "isMap": true,
            "loadPrefix": "prefix!webview/",
            "modules": {
              "foo": {
                "js": "foo.js",
                "css": undefined
              },
              "bar": {
                "js": "bar.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo",
              "bar/bat/:baz": "bar",
              "bar/foo": "bar"
            }
          }
        },
        "store": {
          "web": {
            "isMap": true,
            "loadPrefix": "prefix!web/",
            "modules": {
              "foo": {
                "js": "foo.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo"
            }
          }
        }
      });
      done();
    });
  });

  it('should collect map with local path', function(done) {
    arise.moduleMap(undefined, {localPath: true}, function(err, map) {
      map.should.eql({
        "map": {
          "web": {
            "isMap": true,
            "loadPrefix": "prefix!web/",
            "modules": {
              "foo": {
                "js": "web/foo.js",
                "css": undefined
              },
              "bar": {
                "js": "web/bar.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo",
              "bar/bat/:baz": "bar",
              "bar/foo": "bar"
            }
          },
          "webview": {
            "isMap": true,
            "loadPrefix": "prefix!webview/",
            "modules": {
              "foo": {
                "js": "webview/foo.js",
                "css": undefined
              },
              "bar": {
                "js": "webview/bar.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo",
              "bar/bat/:baz": "bar",
              "bar/foo": "bar"
            }
          }
        },
        "store": {
          "web": {
            "isMap": true,
            "loadPrefix": "prefix!web/",
            "modules": {
              "foo": {
                "js": "web/foo.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo"
            }
          }
        }
      });
      done();
    });
  });

  it('should collect map for specific packages', function(done) {
    arise.moduleMap('store', function(err, map) {
      map.should.eql({
        "store": {
          "web": {
            "isMap": true,
            "loadPrefix": "prefix!web/",
            "modules": {
              "foo": {
                "js": "foo.js",
                "css": undefined
              }
            },
            "routes": {
              "bat/:baz": "foo",
              "foo": "foo"
            }
          }
        }
      });
      done();
    });
  });

  it('should collect map for missing packages', function(done) {
    arise.moduleMap('not found!', function(err, map) {
      map.should.eql({});
      done();
    });
  });

  it('should handle config errors', function(done) {
    var error = new Error('Error!');
    this.stub(stateMachine, 'loadConfig', function(file, event, options, callback) {
      callback(error);
    });
    arise.moduleMap('not found!', function(err, map) {
      err.should.equal(error);
      done();
    });
  });
  it('should handle package errors', function(done) {
    var error = new Error('Error!');
    this.stub(stateMachine, 'loadPackages', function(context, packageName, callback) {
      callback(error);
    });
    arise.moduleMap('not found!', function(err, map) {
      err.should.equal(error);
      done();
    });
  });
});
