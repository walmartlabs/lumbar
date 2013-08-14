var _ = require('underscore'),
    lib = require('../lib');

describe('scope plugin', function() {
  describe('var scope', function() {
    function testScope(scope, scripts, callback) {
      if (_.isFunction(scripts)) {
        callback = scripts;
        scripts = undefined;
      }

      var module = {
        topLevelName: 'foo',
        scripts: scripts || [
          'js/init.js',
          'js/views/test.js'
        ]
      };
      var config = {
        scope: {
          scope: scope,
          template: 'moduleStart{{yield}}moduleEnd'
        }
      };

      lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
        if (!resources.err) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });
        }

        callback(resources);
      });
    }

    it('should scope files', function(done) {
      testScope('file', function(resources) {
        resources.should.eql([
          'moduleStart',
          'js/init.js',
          'js/views/test.js',
          'moduleEnd'
        ]);
        done();
      });
    });
    it('should scope resources', function(done) {
      testScope('resource', function(resources) {
        resources.should.eql([
          'moduleStart',
          '(function() {\n',
          'js/init.js',
          '}).call(this);\n',
          '(function() {\n',
          'js/views/test.js',
          '}).call(this);\n',
          'moduleEnd'
        ]);
        done();
      });
    });
    it('should scope nothing', function(done) {
      testScope('none', function(resources) {
        resources.should.eql([
          'js/init.js',
          'js/views/test.js'
        ]);
        done();
      });
    });

    it('should scope globals', function(done) {
      testScope('file', [{src: 'js/init.js', global: true}, 'js/views/test.js'], function(resources) {
        resources.should.eql([
          'js/init.js',
          'moduleStart',
          'js/views/test.js',
          'moduleEnd'
        ]);
        done();
      });
    });
    it('should fail on defining locals before globals', function(done) {
      testScope('file', ['js/views/test.js', {src: 'js/init.js', global: true}], function(err) {
        err.err.should.match(/Scoped files may not appear before global/);
        done();
      });
    });
  });

  describe('modules', function() {
    describe('object', function() {
      it('should expose top level object inside scope', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ]
        };
        var config = {
          scope: {
            scope: 'file',
            template: 'moduleStart;{{{internalScope}}}{{yield}}moduleEnd'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart;var foo = exports;',
            'js/init.js',
            'moduleEnd'
          ]);
          done();
        });
      });
      it('should map child module alias', function(done) {
        var module = {
          scripts: [
            'js/init.js'
          ]
        };
        var config = {
          modules: {
            module: module
          },
          application: {
            'name': 'Application',
            'module': 'base'
          },
          scope: {
            scope: 'file',
            aliases: {
              'View': 'Application.module',
              'View2': 'Application["module"]',
              'foo': 'foo',
              'Application': 'Application'
            },
            template: 'moduleStart;{{{internalScope}}}{{yield}}moduleEnd'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart;Application[\'module\'] = exports;var View = exports, View2 = exports;',
            'js/init.js',
            'moduleEnd'
          ]);
          done();
        });
      });
    });
    describe('aliases', function() {
      it('should define aliases as parameters', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ]
        };
        var config = {
          scope: {
            scope: 'file',
            aliases: {
              'View': 'Application.View',
              'foo': 'foo',
              'Application': 'Application'
            },
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart(View, Application)',
            'js/init.js',
            'moduleEnd(this, Application.View, Application)'
          ]);
          done();
        });
      });
      it('should handle no aliases', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ]
        };
        var config = {
          scope: {
            scope: 'file',
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart()',
            'js/init.js',
            'moduleEnd(this)'
          ]);
          done();
        });
      });

      it('should pull aliases from module', function(done) {
        var module = {
          topLevelName: 'foo',
          aliases: {
            'View': 'Application.View',
            'foo': 'foo'
          },
          scripts: [
            'js/init.js'
          ]
        };
        var config = {
          scope: {
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})',
            aliases: {
              'View': 'Application.Views',
              'foo': 'food',
              'Application': 'Application'
            }
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart(View, Application)',
            'js/init.js',
            'moduleEnd(this, Application.View, Application)'
          ]);
          done();
        });
      });

      it('should handle alias overrides', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ],
          aliases: {
            'View': 'bar',
            'Application': false
          }
        };
        var config = {
          scope: {
            scope: 'file',
            aliases: {
              'View': 'Application.View',
              'foo': 'foo',
              'Application': 'Application'
            },
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart(View)',
            'js/init.js',
            'moduleEnd(this, bar)'
          ]);
          done();
        });
      });
      it('should handle total alias overrides', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ],
          aliases: {
            'View': false,
            'Application': false
          }
        };
        var config = {
          scope: {
            scope: 'file',
            aliases: {
              'View': 'Application.View',
              'foo': 'foo',
              'Application': 'Application'
            },
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart()',
            'js/init.js',
            'moduleEnd(this)'
          ]);
          done();
        });
      });
      it('should allow for simple alias overrides', function(done) {
        var module = {
          topLevelName: 'foo',
          scripts: [
            'js/init.js'
          ],
          aliases: false
        };
        var config = {
          scope: {
            scope: 'file',
            aliases: {
              'View': 'Application.View',
              'foo': 'foo',
              'Application': 'Application'
            },
            template: 'moduleStart({{{aliasVars}}}){{yield}}moduleEnd({{{callSpec}}})'
          }
        };

        lib.pluginExec('scope', 'scripts', module, [], config, function(resources) {
          resources = _.map(resources, function(resource) {
            return resource.stringValue || resource.src;
          });

          resources.should.eql([
            'moduleStart()',
            'js/init.js',
            'moduleEnd(this)'
          ]);
          done();
        });
      });
    });
  });

  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          name: 'mixin',
          root: 'mixin1/',
          scope: {
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          }
        },
        {
          name: 'mixin2',
          scope: 'none'
        }
      ];

      var config = {
        scope: {
          scope: 'resource',
          aliases: {
            'foo': 'bat',
            'bat': 'baz'
          }
        }
      };

      lib.mixinExec({}, mixins, config, function(libraries, context) {
        libraries.load(context, mixins, function() {
          context.config.attributes.scope.should.eql({
            scope: 'resource',
            template: 'mixin1/module.handlebars',
            aliases: {
              'foo': 'bat',
              'baz': 'bar',
              'bat': 'baz'
            }
          });
          done();
        });
      });
    });
    it('should merge with shorthand', function(done) {
      var mixins = [
        {
          name: 'mixin',
          root: 'mixin1/',
          scope: {
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          }
        },
        {
          name: 'mixin2',
          scope: 'none'
        }
      ];

      var config = {
        scope: 'resource'
      };

      lib.mixinExec({}, mixins, config, function(libraries, context) {
        libraries.load(context, mixins, function() {
          context.config.attributes.scope.should.eql({
            scope: 'resource',
            template: 'mixin1/module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          });
          done();
        });
      });
    });
    it('should create scope config if necessary', function(done) {
      var mixin = {
        name: 'mixin',
        scope: {
          scope: 'module',
          template: 'module.handlebars',
          aliases: {
            'foo': 'bar',
            'baz': 'bar'
          }
        }
      };

      lib.mixinExec({}, [], {}, function(libraries, context) {
        libraries.load(context, mixin, function() {
          context.config.attributes.scope.should.eql({
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          });
          done();
        });
      });
    });
    it('should mixin module aliases', function(done) {
      var mixins = [
        {
          name: 'mixin',
          root: 'mixin1/',
          mixins: {
            mixin1: {
              aliases: {
                'foo': 'bar',
                'baz': 'bar'
              }
            }
          }
        }
      ];

      lib.mixinExec({mixins: ['mixin1'], aliases: {'foo': 'bat'}}, mixins, {}, function(libraries, context) {
        libraries.load(context, mixins, function() {
          context.module.aliases.should.eql({
            'foo': 'bat',
            'baz': 'bar'
          });
          done();
        });
      });
    });
  });
});
