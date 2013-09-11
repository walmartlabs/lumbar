var _ = require('underscore'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    watch = require('../lib/watch');

var readFileSync = fs.readFileSync,
    statSync = fs.statSync;

describe('stylus plugin', function() {
  describe('plugins', function() {
    it('should allow for custom plugins', function(done) {
      fu.lookupPath('');

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
                    resource.plugins.push({
                      plugin: __dirname + '/stylus-mock-worker'
                    });
                    resource.plugins.push({
                      plugin: __dirname + '/stylus-plugin-worker'
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
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.match(/bar: baz;/);
          done();
        });
      });
    });
  });

  describe('watch', function() {
    var mock,
        useMixin,
        content = 'foo\n  display none\n';
    beforeEach(function() {
      useMixin = true;
      mock = watch.mockWatch();

      this.stub(fs, 'readFileSync', function(path) {
        if (/lumbar\.json$/.test(path)) {
          var module;
          if (useMixin) {
            module = {
              mixins: ['module']
            };
          } else {
            module = {
              styles: ['style/test.styl']
            };
          }
          return JSON.stringify({
            modules: {
              module: module
            },
            libraries: ['library/library.json']
          });
        } else if (/library\.json$/.test(path)) {
          return JSON.stringify({
            name: 'mixin' + path,
            modules: {
              module: {styles: ['style/test.styl']}
            },
            styles: {useNib: true}
          });
        } else {
          return readFileSync.apply(this, arguments);
        }
      });
    });
    afterEach(function() {
      mock.cleanup();
    });


    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      var options = {
        plugins: [
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
                    resource.plugins.push({
                      plugin: __dirname + '/stylus-watch-mock-worker',
                      data: {
                        content: content
                      }
                    });
                  }
                });
                complete(err);
              });
            }
          }
        ],
        packageConfigFile: 'config/dev.json'
      };

      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
    }

    it('should continue watching after a compile error', function(done) {
      useMixin = false;
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

    it('should continue watching after initial compile error', function(done) {
      useMixin = false;
      content = '  {yo couch}\n{really}';
      var expectedFiles = ['error', '/module.css'],
          operations = {
            1: function(testdir) {
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
              mock.trigger('change', testdir + 'library/style/test.styl');
            },
            2: function(testdir) {
              content = 'foo\n  display none\n';
              fu.resetCache();
              mock.trigger('change', testdir + 'library/style/test.styl');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });
  });

  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          name: 'mixin',
          styles: {
            'pixelDensity': {
              'iphone': [ 1, 2, 3 ],
              'web': [ 1, 2 ]
            },
            'urlSizeLimit': 103,
            'copyFiles': true,
            'useNib': true,
            'includes': [
              'styles/global.styl',
              'styles/1.styl'
            ]
          }
        },
        {
          name: 'mixin2',
          styles: {
            'pixelDensity': {
              'android': [ 1, 2 ],
              'web': [ 1, 2, 3 ]
            },
            'urlSizeLimit': 104,
            'copyFiles': false,
            'styleRoot': 'foo/',
            'includes': [
              'styles/2.styl'
            ]
          }
        }
      ];

      var config = {
        styles: {
          'pixelDensity': {
            'iphone': [ 1, 2 ]
          },
          'useNib': false,
          'includes': [
            'styles/config.styl'
          ]
        }
      };

      lib.mixinExec({}, mixins, config, function(_libraries, context) {
        context.config.attributes.styles.should.eql({
          'pixelDensity': {
            'iphone': [ 1, 2 ],
            'web': [ 1, 2, 3 ],
            'android': [ 1, 2 ]
          },
          'useNib': false,
          'includes': [
            {src: 'styles/global.styl', library: mixins[0]},
            {src: 'styles/1.styl', library: mixins[0]},
            {src: 'styles/2.styl', library: mixins[1]},
            'styles/config.styl'
          ],
          'urlSizeLimit': 104,
          'copyFiles': false
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixin = {
        name: 'mixin',
        'styles': {
          'pixelDensity': {
            'iphone': [ 1, 2 ]
          },
          'useNib': true
        }
      };

      lib.mixinExec({}, [], {}, function(libraries, context) {
        libraries.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            'pixelDensity': {
              'iphone': [ 1, 2 ]
            },
            'useNib': true
          });
          done();
        });
      });
    });
    it('should update path references', function(done) {
      var mixin = {
        name: 'mixin',
        'styles': {
          'includes': ['foo', 'bar'],
          'styleRoot': 'baz'
        }
      };

      lib.mixinExec({}, [], {}, function(libraries, context) {
        mixin.root = 'a/';
        libraries.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            'includes': [
              {src: 'a/foo', library: mixin},
              {src: 'a/bar', library: mixin}
            ]
          });
          done();
        });
      });
    });

    it('should lookup files from mixins', function(done) {
      fu.lookupPath('');

      var mixins = [{
        name: 'mixin',
        root: 'mixinRoot/',
        mixins: {
          'stylus': {
            'styles': [
              'file1.styl',
              'file2.styl',
              'file3.styl',
              'file4.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'stylusRoot/',
          'includes': [
            'mixin-import.styl'
          ]
        }
      }];

      var config = {
        'modules': {
          'test': {
            'mixins': [
              {
                name: 'stylus',
                overrides: {
                  'file1.styl': 'bar1.styl',
                  'file3.styl': true,
                  'stylusRoot/file4.styl': true
                }
              }
            ],
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'otherRoot/'
        }
      };

      lib.pluginExec('stylus', 'styles', config.modules.test, mixins, config, function(resources, context) {

        resources[0].plugins.push({
          plugin: __dirname + '/stylus-mock-worker',
          data: {
            rewrite: true
          }
        });
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          checkData(data, [
            'mixinRoot/stylusRoot/mixin-import.styl',
            'mixinRoot/mixin-import.styl',
            'mixinRoot/stylusRoot/foo.styl',
            'mixinRoot/foo.styl',
            'mixinRoot/stylusRoot/img.png',
            'mixinRoot/img.png',
            'otherRoot/bar1.styl',
            'mixinRoot/stylusRoot/file2.styl',
            'mixinRoot/file2.styl',
            'otherRoot/file3.styl',
            'otherRoot/file4.styl',
            'otherRoot/file1.styl',
            'otherRoot/img.png',
            'otherRoot/file2.styl'
          ]);
          done();
        });
      });
    });
    it('should override mixins relative to declaring library', function(done) {
      fu.lookupPath('');

      var mixins = [{
        name: 'mixin1',
        root: 'mixin1/',
        mixins: {
          mixin1: {
            mixins: [
              {
                name: 'mixin2',
                overrides: {
                  'file1.styl': 'bar1.styl',
                  'file3.styl': true,
                  'stylusRoot/file4.styl': true
                }
              }
            ]
          }
        },
        'styles': {
          'styleRoot': 'otherRoot/'
        }
      },
      {
        name: 'mixin',
        root: 'mixin2/',
        mixins: {
          'mixin2': {
            'styles': [
              'file1.styl',
              'file2.styl',
              'file3.styl',
              'file4.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'stylusRoot/',
          'includes': [
            'mixin-import.styl'
          ]
        }
      }];

      var config = {
        modules: {
          module: {
            mixins: [
              "mixin1"
            ],
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'stillAnotherRoot/'
        }
      };


      lib.pluginExec('stylus', 'styles', config.modules.module, mixins, config, function(resources, context) {
        resources[0].plugins.push({
          plugin: __dirname + '/stylus-mock-worker',
          data: {
            rewrite: true
          }
        });
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          checkData(data, [
            'mixin2/stylusRoot/mixin-import.styl',
            'mixin2/mixin-import.styl',
            'mixin2/stylusRoot/foo.styl',
            'mixin2/foo.styl',
            'mixin2/stylusRoot/img.png',
            'mixin2/img.png',
            'mixin1/otherRoot/bar1.styl',
            'mixin2/stylusRoot/file2.styl',
            'mixin2/file2.styl',
            'mixin1/otherRoot/file3.styl',
            'mixin1/otherRoot/file4.styl',
            'stillAnotherRoot/file1.styl',
            'stillAnotherRoot/img.png',
            'stillAnotherRoot/file2.styl'
          ]);
          done();
        });
      });
    });
    it('should override nested mixins relative to declaring library', function(done) {
      fu.lookupPath('');

      var mixins = [{
        name: 'mixin1',
        root: 'mixin1/',
        mixins: {
          mixin1: {
            mixins: ['mixin2']
          }
        },
        'styles': {
          'styleRoot': 'otherRoot/'
        }
      },
      {
        name: 'mixin',
        root: 'mixin2/',
        mixins: {
          'mixin2': {
            'styles': [
              'file1.styl',
              'file2.styl',
              'file3.styl',
              'file4.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'stylusRoot/',
          'includes': [
            'mixin-import.styl'
          ]
        }
      }];

      var config = {
        modules: {
          module: {
            mixins: [
              {
                name: "mixin1",
                overrides: {
                  'file1.styl': 'bar1.styl',
                  'file3.styl': true,
                  'stylusRoot/file4.styl': true
                }
              }
            ],
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        },
        'styles': {
          'styleRoot': 'stillAnotherRoot/'
        }
      };


      lib.pluginExec('stylus', 'styles', config.modules.module, mixins, config, function(resources, context) {
        resources[0].plugins.push({
          plugin: __dirname + '/stylus-mock-worker',
          data: {
            rewrite: true
          }
        });
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          checkData(data, [
            'mixin2/stylusRoot/mixin-import.styl',
            'mixin2/mixin-import.styl',
            'mixin2/stylusRoot/foo.styl',
            'mixin2/foo.styl',
            'mixin2/stylusRoot/img.png',
            'mixin2/img.png',
            'stillAnotherRoot/bar1.styl',
            'mixin2/stylusRoot/file2.styl',
            'mixin2/file2.styl',
            'stillAnotherRoot/file3.styl',
            'stillAnotherRoot/file4.styl',
            'stillAnotherRoot/file1.styl',
            'stillAnotherRoot/img.png',
            'stillAnotherRoot/file2.styl'
          ]);
          done();
        });
      });
    });
  });
});

function checkData(data, expected) {
  var cwd = process.cwd();
  var content = _.map(JSON.parse(data.content), function(path) {
    if (path.indexOf(cwd) === 0) {
      return path.substring(cwd.length+1);
    } else {
      return path;
    }
  });
  content.should.eql(expected);
}
