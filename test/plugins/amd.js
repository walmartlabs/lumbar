var _ = require('underscore'),
    amd = require('../../lib/plugins/amd'),
    build = require('../../lib/build'),
    fu = require('../../lib/fileUtil'),
    fs = require('fs'),
    sinon = require('sinon');

describe('amd plugin', function() {
  var appModule,
      defineSource,
      topLevel,
      context,
      expectedCache,
      next;
  beforeEach(function() {
    fu.resetCache();

    appModule = false;
    topLevel = false;
    next = this.spy(function(callback) { callback(undefined, [context.resource]); });
    context = {
      event: {
        emit: this.spy()
      },
      platformCache: {
        amdAppModules: {}
      },
      fileCache: {
        amdRegistrationOutput: true,
        amdFileModules: {}
      },
      config: {
        isTopLevel: function() {
          return appModule || topLevel;
        },
        isAppModule: function() {
          return appModule;
        },
        attributes: {
          amd: true
        }
      },
      libraries: {
        getConfig: function() {
          return {name: 'lib', root: 'foo/'};
        }
      }
    };

    expectedCache = {
      'foo/bar': {
        defined: [{
          name: 'js/foo/bar.js',
          resourceName: 'js/foo/bar.js',
          loc: {
            start: {
              line: 1,
              column: 25
            },
            end: {
              line: 1,
              column: 38
            }
          },
          deps: ['view!baz'],
          amd: true,
          view: true,
          loader: amd.loaders.view,
          source: 'function() {}'
        }],
        dependencies: ['view!baz']
      },
      'views/baz': {
        defined: [{
          name: 'js/views/baz.js',
          resourceName: 'js/views/baz.js',
          loc: {
            start: {
              line: 1,
              column: 25
            },
            end: {
              line: 1,
              column: 38
            }
          },
          deps: ['view!baz'],
          amd: true,
          view: true,
          loader: amd.loaders.view,
          source: 'function() {}'
        }],
        dependencies: ['view!baz']
      }
    };

    this.stub(amd.defaultLoader, 'output', function(defined) {
      return {amd: defined.name};
    });
    this.stub(amd.loaders.view, 'output', function(defined) {
      return {amd: defined.name};
    });

    this.stub(fu, 'setFileArtifact');

    defineSource = 'defineView(["view!baz"], function() {})';
    this.stub(fs, 'readFile', function(path, callback) {
      if (/js\/foo\/foo.js$/.test(path)) {
        callback(undefined, 'defineView(["bar"], function() {})');
      } else if (/js\/invalid.js$/.test(path)) {
        callback(undefined, 'This is not amd. Hell, its not even javascript');
      } else if (/js\/nonamd.js$/.test(path)) {
        callback(undefined, 'notAMD;');
      } else {
        callback(undefined, defineSource);
      }
    });
  });

  it('should NOP if AMD mode is not enabled', function(done) {
    context.config.attributes.amd = false;

    amd.moduleResources(
      context, next,
      function() {
        next.should.have.been.calledOnce;
        should.not.exist(context.platformCache.amd);
        done();
      });
  });
  it('should handle error in next', function(done) {
    context.resource = 'js/foo/bar.js';

    var error = new Error();
    amd.moduleResources(context, function(callback) { callback(error); }, function(err) {
      err.should.equal(error);
      done();
    });
  });
  it('should handle file errors', function(done) {
    context.resource = 'js/foo/bar.js';

    var error = new Error();
    fs.readFile.restore();
    this.stub(fs, 'readFile', function(path, callback) {
      callback(error);
    });
    amd.moduleResources(context, next, function(err) {
      err.should.equal(error);
      done();
    });
  });
  describe('parser', function() {
    it('should parse js files', function(done) {
      context.resource = 'js/foo/bar.js';
      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/foo/bar.js', 'amd', expectedCache['foo/bar']);
          fu.setFileArtifact.should.have.been.calledWith('js/views/baz.js', 'amd', expectedCache['views/baz']);
          done();
        });
    });
    it('should ignore files that have opt out', function(done) {
      context.resource = {src: 'js/foo/bar.js', amd: false};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.not.have.been.called;
          resources.should.eql([{src: 'js/foo/bar.js', amd: false}]);
          done();
        });
    });
    it('should handle non-amd js files', function(done) {
      context.resource = 'js/nonamd.js';
      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/nonamd.js', 'amd', false);
          done();
        });
    });
    it('should handle improperly formated js files', function(done) {
      context.resource = 'js/invalid.js';
      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/invalid.js', 'amd', false);
          done();
        });
    });
    it('should error if multiple modules are defined', function(done) {
      context.resource = 'js/define.js';
      defineSource = 'define(function() {});define(function() {});';
      amd.moduleResources(
        context, next,
        function(err) {
          err.should.match(/Multiple modules defined in "js\/define.js"/);
          done();
        });
    });
    it('should parse js files with simple path', function(done) {
      context.resource = 'js/bar.js';
      expectedCache['foo/bar'].defined[0].name = 'js/bar.js';
      expectedCache['foo/bar'].defined[0].resourceName = 'js/bar.js';

      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/bar.js', 'amd', expectedCache['foo/bar']);
          fu.setFileArtifact.should.have.been.calledWith('js/views/baz.js', 'amd', expectedCache['views/baz']);
          done();
        });
    });
    it('should parse complex files', function(done) {
      context.resource = {'src': 'js/foo/bar.js'};
      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/foo/bar.js', 'amd', expectedCache['foo/bar']);
          fu.setFileArtifact.should.have.been.calledWith('js/views/baz.js', 'amd', expectedCache['views/baz']);
          done();
        });
    });
    it('should not parse non-js files', function(done) {
      context.resource = 'js/foo/bar.coffee';
      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.not.have.been.called;
          done();
        });
    });
    it('should recursively parse', function(done) {
      context.resource = 'js/foo/foo.js';
      expectedCache.bar = expectedCache['foo/bar'];
      expectedCache.bar.defined[0].name = 'js/bar.js';
      expectedCache['foo/bar'].defined[0].resourceName = 'js/bar.js';
      delete expectedCache['foo/bar'];
      expectedCache['foo/foo'] = {
        defined: [{
          name: 'js/foo/foo.js',
          resourceName: 'js/foo/foo.js',
          loc: {
            start: {
              line: 1,
              column: 20
            },
            end: {
              line: 1,
              column: 33
            }
          },
          deps: ['bar'],
          amd: true,
          view: true,
          loader: amd.loaders.view,
          source: 'function() {}'
        }],
        dependencies: ['bar']
      };

      amd.moduleResources(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/foo/foo.js', 'amd', expectedCache['foo/foo']);
          fu.setFileArtifact.should.have.been.calledWith('js/bar.js', 'amd', expectedCache.bar);
          fu.setFileArtifact.should.have.been.calledWith('js/views/baz.js', 'amd', expectedCache['views/baz']);
          done();
        });
    });
  });

  describe('resources', function() {
    it('should ignore non-amd js files', function(done) {
      context.resource = 'js/nonamd.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/nonamd.js']);
          done();
        });
    });
    it('should ignore improperly formated js files', function(done) {
      context.resource = 'js/invalid.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/invalid.js']);
          done();
        });
    });

    it('should insert dependencies', function(done) {
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'js/views/baz.js'},
            {amd: 'js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);
          done();
        });
    });
    it('should not include filtered files', function(done) {
      this.stub(build, 'filterResource', function() { return false; });

      context.resource = {'src': 'js/foo/foo.js', 'platform': 'foo'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([{src: 'js/foo/foo.js', 'platform': 'foo'}]);
          should.not.exist(context.platformCache.amd);
          context.fileCache.amdFileModules.should.eql({});
          done();
        });
    });
    it('should insert recursive cached dependencies', function(done) {
      context.resource = {'src': 'js/bar.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          fs.readFile.reset();
          context.fileCache = {
            amdRegistrationOutput: true
          };

          context.resource = {'src': 'js/foo/foo.js'};
          amd.moduleResources(
            context, next,
            function(err, resources) {
              resources.should.eql([
                {amdRegistration: true},
                {amd: 'js/views/baz.js'},
                {amd: 'js/bar.js'},
                {amd: 'js/foo/foo.js'}
              ]);
              fs.readFile.should.have.been.calledOnce;
              done();
            });
        });
    });
    it('should insert dependencies for top level modules', function(done) {
      topLevel = true;
      context.platformCache.amdAppModules['view!baz'] = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'js/views/baz.js'},
            {amd: 'js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);
          done();
        });
    });
    it('should not insert dependencies included in application module', function(done) {
      context.platformCache.amdAppModules['js/views/baz.js'] = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);
          done();
        });
    });
    it('should update the app module include listing if building the app module', function(done) {
      delete context.platformCache.amdAppModules;

      appModule = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'js/views/baz.js'},
            {amd: 'js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);
          _.keys(context.platformCache.amdAppModules).should.eql(['js/foo/foo.js', 'js/bar.js', 'js/views/baz.js']);
          done();
        });
    });
    it('should not duplicate dependencies in the current file', function(done) {
      // Not strictly required that we do this as the combiner logic will remove dupes
      // but we need to track some of this for circular deps handling anyway
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'js/views/baz.js'},
            {amd: 'js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);

          amd.moduleResources(
            context, next,
            function(err, resources) {
              resources.should.eql([
                {amdRegistration: true},
                {amd: 'js/foo/foo.js'}
              ]);
              done();
            });
        });
    });

    it('should honor overrides', function(done) {
      var lib = {name: 'lib', root: 'foo/', overrides: {'js/bar.js': 'js/nonamd.js'}};
      context.resource = {'src': 'js/foo/foo.js', library: lib};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {
              src: 'js/nonamd.js',
              originalSrc: "foo/js/bar.js",
              library: lib
            },
            {amd: 'foo/js/foo/foo.js'}
          ]);

          done();
        });
    });
  });

  describe('libraries', function() {
    it('should load from the current library', function(done) {
      context.resource = {'src': 'js/foo/foo.js', library: {name: 'lib', root: 'foo/'}};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/foo\/foo.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/bar.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/views\/baz.js/));

          resources.should.eql([
            {amdRegistration: true},
            {amd: 'foo/js/views/baz.js'},
            {amd: 'foo/js/bar.js'},
            {amd: 'foo/js/foo/foo.js'}
          ]);
          done();
        });
    });
    it('should load from specified library', function(done) {
      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        if (/js\/foo\/foo.js$/.test(path)) {
          callback(undefined, 'defineView(["lib:bar"], function() {})');
        } else {
          callback(undefined, 'defineView(["view!lib:baz"], function() {})');
        }
      });
      context.resource = {'src': 'js/foo/foo.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          fs.readFile.should.have.been.calledWith(sinon.match(/js\/foo\/foo.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/bar.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/views\/baz.js/));

          resources.should.eql([
            {amdRegistration: true},
            {amd: 'foo/js/views/baz.js'},
            {amd: 'foo/js/bar.js'},
            {amd: 'js/foo/foo.js'}
          ]);
          done();
        });
    });
    it('should treat files with the same name in different libraries as distinct', function(done) {
      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'defineView(["lib:bar"], function() {})');
      });
      context.resource = {'src': 'js/bar.js'};
      amd.moduleResources(
        context, next,
        function(err, resources) {
          resources.should.eql([
            {amdRegistration: true},
            {amd: 'foo/js/bar.js'},
            {amd: 'js/bar.js'}
          ]);
          done();
        });
    });
  });

  describe('registration', function() {
    beforeEach(function() {
      context.resource = 'js/define.js';
      defineSource = 'define(function() {})';
      context.fileCache.amdRegistrationOutput = false;
    });

    // Note: The output already occured cases is covered by the rest of these tests
    it('should output local registration', function(done) {
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            {amd: 'js/define.js'}
          ]);
          done();
        });
    });
    it('should output app registration', function(done) {
      appModule = true;
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            {amd: 'js/define.js'}
          ]);
          done();
        });
    });
  });

  describe('defaultLoader', function() {
    beforeEach(function() {
      amd.defaultLoader.output.restore();

      context.resource = 'js/define.js';
    });

    it('should include define boilerplate', function(done) {
      defineSource = 'define(function() {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[1] = ',
            '(function() {}',
            ')();\n'
          ]);
          done();
        });
    });
    it('should handle non-define content', function(done) {
      defineSource = 'define(function() {});var foo;';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[1] = ',
            '(function() {}',
            ')();\n',
            'var foo;'
          ]);
          done();
        });
    });
    it('should lookup global define dependencies', function(done) {
      context.platformCache.amdAppModules['js/baz.js'] = 1;
      defineSource = 'define(["baz"], function(baz) {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[1] = ',
            '(function(baz) {}',
            ')(wmd[1]);\n'
          ]);
          done();
        });
    });
    it('should lookup local define dependencies', function(done) {
      appModule = false;
      context.fileCache.amdFileModules['js/baz.js'] = 2;
      defineSource = 'define(["baz"], function(baz) {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            // Circular dependency here can be ignored as we are sending funky data in
            // and we are testing the dependency generation.
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz) {}',
            ')(lwmd[2]);\n'
          ]);
          done();
        });
    });
    it('should pass undefined for non-amd references', function(done) {
      context.fileCache.amdFileModules['js/noamd.js'] = false;
      defineSource = 'define(["noamd"], function(baz) {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz) {}',
            ')(undefined);\n'
          ]);
          done();
        });
    });
  });

  describe('view loader', function() {
    beforeEach(function() {
      amd.defaultLoader.output.restore();
      amd.loaders.view.output.restore();

      context.resource = 'js/views/nested/define.js';
    });

    it('should output view boilerplate', function(done) {
      defineSource = 'defineView(function() {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[1] = ',
            'Thorax.Views["nested/define"] = (',
            'function() {}',
            ')();\n',
            'lwmd[1].prototype.name = "nested/define";\n'
          ]);
          done();
        });
    });
    it('should lookup from view hash', function(done) {
      context.resource = 'js/define.js';
      appModule = false;
      context.fileCache.amdFileModules['js/views/baz.js'] = 1;
      context.platformCache.amdAppModules['js/views/boz.js'] = 1;
      defineSource = 'define(["view!baz", "views/boz"], function(baz, boz) {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz, boz) {}',
            ')(lwmd[1], wmd[1]);\n'
          ]);
          done();
        });
    });
  });

  describe('handlebars loader', function() {
    beforeEach(function() {
      // Really testing the handlebars plugin but test setup is easier this way
      require('../../lib/plugins/handlebars');

      amd.defaultLoader.output.restore();

      context.resource = 'js/define.js';
      context.config.attributes.templates = { root: 'templates' };
    });

    it('should output template resource', function(done) {
      defineSource = 'define(["hbs!foo"], function(foo) {})';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            {src: 'templates/foo.handlebars'},
            'lwmd[1] = ',
            '(function(foo) {}',
            ')(Handlebars.templates["foo"]);\n'
          ]);
          done();
        });
    });
    it('should lookup template resource in library', function(done) {
      context.resource = {src: 'js/define.js', library: {name: 'lib', root: 'foo/'}};

      defineSource = 'define(["hbs!foo"], function(foo) {})';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            {src: 'foo/templates/foo.handlebars', library: {name: 'lib', root: 'foo/'}},
            'lwmd[1] = ',
            '(function(foo) {}',
            ')(Handlebars.templates["foo"]);\n'
          ]);
          done();
        });
    });
  });

  describe('helpers loader', function() {
    beforeEach(function() {
      // Really testing the handlebars plugin but test setup is easier this way
      require('../../lib/plugins/handlebars');

      context.resource = 'js/helpers/define.js';
    });

    it('should output', function(done) {
      defineSource = 'defineHelper(["helper!foo"], function(foo) {})';
      context.fileCache.amdFileModules['js/helpers/foo.js'] = 1;

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(',
            'function(foo) {}',
            ')(lwmd[1]));\n',
            'Handlebars.registerHelper("define", lwmd[2]);\n'
          ]);
          context.fileCache.knownHelpers.should.eql(['define']);
          done();
        });
    });
    it('should lookup from helpers hash', function(done) {
      amd.defaultLoader.output.restore();

      context.resource = 'js/define.js';
      appModule = false;
      context.fileCache.amdFileModules['js/helpers/baz.js'] = 1;
      context.platformCache.amdAppModules['js/helpers/boz.js'] = 1;
      defineSource = 'define(["helper!baz", "helpers/boz"], function(baz, boz) {})';

      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz, boz) {}',
            ')(lwmd[1], wmd[1]);\n'
          ]);
          done();
        });
    });
    it('should output global known helpers', function(done) {
      context.config.attributes.templates = {
        knownHelpers: []
      };
      defineSource = 'defineHelper(function() {})';
      appModule = true;

      amd.moduleResources(
        context, next,
        function(err, resources) {
          context.config.attributes.templates.knownHelpers.should.eql(['define']);
          done();
        });
    });
  });

  describe('custom loading', function() {
    beforeEach(function() {
      amd.loaders.custom = {
        resource: this.spy(function(name) {
          return {src: 'resource_' + name};
        }),
        lookup: function(name, path, isAppModule, context) {
          if (isAppModule) {
            return 'lookie_here_' + name;
          } else {
            return 'lookie_there_' + name;
          }
        }
      };

      expectedCache = {
        'foo/bar': {
          defined: [{
            name: 'foo/bar',
            loc: {
              start: {
                line: 1,
                column: 27
              },
              end: {
                line: 1,
                column: 40
              }
            },
            amd: true,
            view: true,
            loader: amd.loaders.view,
            source: 'function() {}'
          }],
          dependencies: ['custom!baz']
        }
      };

      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'define(["custom!baz"], function(baz) {})');
      });
    });
    afterEach(function() {
      delete amd.loaders.custom;
    });

    it('should allow for custom resources', function(done) {
      context.resource = 'js/foo/bar.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          amd.loaders.custom.resource.should.have.been.calledWith('baz');

          resources.should.eql([
            {amdRegistration: true},
            {src: 'resource_baz'},
            {amd: 'js/foo/bar.js'}
          ]);
          done();
        });
    });
    it('should allow for custom output mechanisms', function(done) {
      amd.defaultLoader.output.restore();

      appModule = false;
      context.fileCache.amdFileModules.resource_baz = true;
      context.resource = 'js/foo/bar.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz) {}',
            ')(lookie_there_baz);\n'
          ]);
          done();
        });
    });

    it('should allow for custom lookup mechanisms from module', function(done) {
      amd.defaultLoader.output.restore();

      appModule = false;
      context.fileCache.amdFileModules.resource_baz = true;
      context.resource = 'js/foo/bar.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz) {}',
            ')(lookie_there_baz);\n'
          ]);
          done();
        });
    });
    it('should allow for custom lookup mechanisms from global', function(done) {
      amd.defaultLoader.output.restore();

      appModule = true;
      context.fileCache.amdFileModules.resource_baz = true;
      context.resource = 'js/foo/bar.js';
      amd.moduleResources(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {amdRegistration: true},
            'lwmd[2] = ',
            '(function(baz) {}',
            ')(lookie_here_baz);\n'
          ]);
          done();
        });
    });
  });

  describe('config change', function() {
    it('should detect when style config changed');
    it('should detect when application module impacts modules');
  });
});

function mapResources(resources) {
  return _.map(resources, function(resource) { return resource.stringValue || resource; });
}
