var _ = require('underscore'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    sinon = require('sinon'),
    watch = require('../lib/watch');

describe('stylus plugin', function() {
  var readFileSync = fs.readFileSync,
      statSync = fs.statSync,
      read;
  beforeEach(function() {
    read = [];
  });

  describe('plugins', function() {
    after(function() {
      fs.readFileSync = readFileSync;
      fs.statSync = statSync;
    });
    it('should allow for custom plugins', function(done) {
      fu.lookupPath('');

      fs.readFileSync = function(path) {
        if (/\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
          read.push(path);
          return '.test\n  display none\n';
        } else {
          return readFileSync.apply(this, arguments);
        }
      };
      fs.statSync = function(path) {
        if (!/\.styl|png$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
          return statSync.apply(this, arguments);
        }
      };

      var seen = [];
      var config = {
        'modules': {
          'test': {
            'styles': ['file1.styl']
          }
        },
        plugins: [
          'stylus',
          {
            mode: 'styles',
            priority: 25,
            module: function(context, next, complete) {
              next(function(err) {
                if (err) {
                  throw err;
                }

                _.each(context.moduleResources, function(resource) {
                  if (resource.stylus) {
                    resource.plugins.push(function(compiler) {
                      seen.push(compiler);
                    });
                  }
                });
                complete(err);
              });
            }
          }
        ]
      };

      lib.pluginExec(undefined, 'styles', config.modules.test, [], config, function(resources, context) {
        context.loadResource(resources[0], function(err) {
          if (err) {
            throw err;
          }

          seen.length.should.eql(1);
          seen[0].evaluator.should.exist;
          done();
        });
      });
    });
  });

  describe('watch', function() {
    var mock,
        content = 'foo\n  display none\n';
    beforeEach(function() {
      mock = watch.mockWatch();

      sinon.stub(fs, 'readFileSync', function(path) {
        if (/test\.styl$/.test(path)) {
          return content;
        } else if (/lumbar\.json$/.test(path)) {
          return JSON.stringify({
            modules: {
              module: {
                mixins: ['module']
              }
            },
            mixins: ['mixin/mixin.json']
          });
        } else if (/mixin\.json$/.test(path)) {
          return JSON.stringify({
            modules: {
              module: {styles: ['style/test.styl']}
            },
            styles: {useNib: true}
          });
        } else {
          return readFileSync.apply(this, arguments);
        }
      });
      sinon.stub(fs, 'statSync', function(path) {
        if (!/test\.styl$/.test(path)) {
          return statSync.apply(this, arguments);
        }
      });
    });
    afterEach(function() {
      fs.readFileSync.restore();
      fs.statSync.restore();
      mock.cleanup();
    });


    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      var options = {packageConfigFile: 'config/dev.json'};

      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
    }

    it('should continue watching after a compile error', function(done) {
      var expectedFiles = ['/module.css', 'error', '/module.css'],
          operations = {
            1: function(testdir) {
              content = '  {yo couch}\n{really}';
              fu.resetCache();
              mock.trigger('change', testdir + 'style/test.styl');
            },
            2: function(testdir) {
              content = 'foo\n  display none\n';
              fu.resetCache();
              mock.trigger('change', testdir + 'style/test.styl');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });

    it('should continue watching after a compile error in mixin', function(done) {
      var expectedFiles = ['/module.css', 'error', '/module.css'],
          operations = {
            1: function(testdir) {
              content = '  {yo couch}\n{really}';
              fu.resetCache();
              mock.trigger('change', testdir + 'style/test.styl');
            },
            2: function(testdir) {
              content = 'foo\n  display none\n';
              fu.resetCache();
              mock.trigger('change', testdir + 'style/test.styl');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });
  });

  describe('mixin', function() {
    afterEach(function() {
      fs.readFileSync = readFileSync;
      fs.statSync = statSync;
    });
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          styles: {
            "pixelDensity": {
              "iphone": [ 1, 2, 3 ],
              "web": [ 1, 2 ]
            },
            "urlSizeLimit": 103,
            "copyFiles": true,
            "useNib": true,
            "includes": [
              "styles/global.styl",
              "styles/1.styl"
            ]
          }
        },
        {
          styles: {
            "pixelDensity": {
              "android": [ 1, 2 ],
              "web": [ 1, 2, 3 ]
            },
            "urlSizeLimit": 104,
            "copyFiles": false,
            "styleRoot": "foo/",
            "includes": [
              "styles/2.styl"
            ]
          }
        }
      ];

      var config = {
        styles: {
          "pixelDensity": {
            "iphone": [ 1, 2 ]
          },
          "useNib": false,
          "includes": [
            "styles/config.styl"
          ]
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "pixelDensity": {
            "iphone": [ 1, 2 ],
            "web": [ 1, 2, 3 ],
            "android": [ 1, 2 ]
          },
          "useNib": false,
          "includes": [
            "styles/global.styl",
            "styles/1.styl",
            "styles/2.styl",
            "styles/config.styl"
          ],
          "urlSizeLimit": 104,
          "copyFiles": false
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixin = {
        "styles": {
          "pixelDensity": {
            "iphone": [ 1, 2 ]
          },
          "useNib": true
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "pixelDensity": {
              "iphone": [ 1, 2 ]
            },
            "useNib": true
          });
          done();
        });
      });
    });
    it('should update path references', function(done) {
      var mixin = {
        "styles": {
          "includes": ['foo', 'bar'],
          "styleRoot": 'baz'
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixin.root = 'a/';
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "includes": ['a/foo', 'a/bar']
          });
          done();
        });
      });
    });

    it('should lookup files from mixins', function(done) {
      fu.lookupPath('');

      fs.readFileSync = function(path) {
        if (path === 'mixinRoot/mixin-import.styl') {
          read.push(path);
          return '@import "foo"\n';
        } else if (/\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
          read.push(path);
          return '.test\n  background url("img.png")\n';
        } else {
          return readFileSync.apply(this, arguments);
        }
      };
      fs.statSync = function(path) {
        if (!/\.styl|png$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
          return statSync.apply(this, arguments);
        } else if (/mixinRoot/.test(path)) {
          if (/stylusRoot/.test(path)) {
            read.push(path);
            throw new Error();
          }
        }
      };

      var mixins = [{
        root: 'mixinRoot/',
        mixins: {
          'stylus': {
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        },
        'styles': {
          'stylusRoot': 'stylusRoot/',
          'includes': [
            'mixin-import.styl'
          ]
        }
      }];

      var config = {
        'modules': {
          'test': {
            'mixins': [
              {name: 'stylus', overrides: {'file1.styl': 'bar1.styl'}}
            ],
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        }
      };

      lib.pluginExec('stylus', 'styles', config.modules.test, mixins, config, function(resources, context) {
        context.loadResource(resources[0], function(err) {
          if (err) {
            throw err;
          }

          read.should.eql([
            'mixinRoot/stylusRoot/mixin-import.styl',
            'mixinRoot/mixin-import.styl',
            'mixinRoot/stylusRoot/foo.styl',
            'mixinRoot/foo.styl',
            'mixinRoot/stylusRoot/img.png',
            'mixinRoot/img.png',
            'bar1.styl',
            'mixinRoot/stylusRoot/file2.styl',
            'mixinRoot/file2.styl',
            'file1.styl',
            'img.png',
            'file2.styl'
          ]);
          done();
        });
      });
    });
  });
});
