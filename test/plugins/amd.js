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
          name: 'foo/bar',
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
          name: 'view!baz',
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

    amd.resourceList(
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
    amd.resourceList(context, function(callback) { callback(error); }, function(err) {
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
    amd.resourceList(context, next, function(err) {
      err.should.equal(error);
      done();
    });
  });
  describe('parser', function() {
    it('should parse js files', function(done) {
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
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
      amd.resourceList(
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
      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/nonamd.js', 'amd', false);
          done();
        });
    });
    it('should handle improperly formated js files', function(done) {
      context.resource = 'js/invalid.js';
      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/invalid.js', 'amd', false);
          done();
        });
    });
    it('should parse js files with simple path', function(done) {
      context.resource = 'js/bar.js';
      expectedCache['foo/bar'].defined[0].name = 'bar';

      amd.resourceList(
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
      amd.resourceList(
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
      amd.resourceList(
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
      expectedCache.bar.defined[0].name = 'bar';
      delete expectedCache['foo/bar'];
      expectedCache['foo/foo'] = {
        defined: [{
          name: 'foo/foo',
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

      amd.resourceList(
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
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/nonamd.js']);
          done();
        });
    });
    it('should ignore improperly formated js files', function(done) {
      context.resource = 'js/invalid.js';
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/invalid.js']);
          done();
        });
    });

    it('should insert dependencies', function(done) {
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'view!baz'}, {amd: 'bar'}, {amd: 'foo/foo'}]);
          done();
        });
    });
    it('should not include filtered files', function(done) {
      this.stub(build, 'filterResource', function() { return false; });

      context.resource = {'src': 'js/foo/foo.js', 'platform': 'foo'};
      amd.resourceList(
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
      amd.resourceList(
        context, next,
        function(err, resources) {
          fs.readFile.reset();
          context.fileCache = {};

          context.resource = {'src': 'js/foo/foo.js'};
          amd.resourceList(
            context, next,
            function(err, resources) {
              resources.should.eql([{amd: 'view!baz'}, {amd: 'bar'}, {amd: 'foo/foo'}]);
              fs.readFile.should.have.been.calledOnce;
              done();
            });
        });
    });
    it('should insert dependencies for top level modules', function(done) {
      topLevel = true;
      context.platformCache.amdAppModules['view!baz'] = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'view!baz'}, {amd: 'bar'}, {amd: 'foo/foo'}]);
          done();
        });
    });
    it('should not insert dependencies included in application module', function(done) {
      context.platformCache.amdAppModules['view!baz'] = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'bar'}, {amd: 'foo/foo'}]);
          done();
        });
    });
    it('should update the app module include listing if building the app module', function(done) {
      delete context.platformCache.amdAppModules;

      appModule = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'view!baz'}, {amd: 'bar'}, {amd: 'foo/foo'}]);
          _.keys(context.platformCache.amdAppModules).should.eql(['foo/foo', 'bar', 'view!baz']);
          done();
        });
    });
    it('should not duplicate dependencies in the current file', function(done) {
      // Not strictly required that we do this as the combiner logic will remove dupes
      // but we need to track some of this for circular deps handling anyway
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'view!baz'}, {amd: 'bar'}, {amd: 'foo/foo'}]);

          amd.resourceList(
            context, next,
            function(err, resources) {
              resources.should.eql([{amd: 'foo/foo'}]);
              done();
            });
        });
    });
  });

  describe('libraries', function() {
    it('should load from the current library', function(done) {
      context.resource = {'src': 'foo/js/foo/foo.js', library: {name: 'lib', root: 'foo/'}};
      amd.resourceList(
        context, next,
        function(err, resources) {
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/foo\/foo.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/bar.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/views\/baz.js/));

          resources.should.eql([{amd: 'view!lib:baz'}, {amd: 'lib:bar'}, {amd: 'lib:foo/foo'}]);
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
      amd.resourceList(
        context, next,
        function(err, resources) {
          fs.readFile.should.have.been.calledWith(sinon.match(/js\/foo\/foo.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/bar.js/));
          fs.readFile.should.have.been.calledWith(sinon.match(/foo\/js\/views\/baz.js/));

          resources.should.eql([{amd: 'view!lib:baz'}, {amd: 'lib:bar'}, {amd: 'foo/foo'}]);
          done();
        });
    });
    it('should treat files with the same name in different libraries as distinct', function(done) {
      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'defineView(["lib:bar"], function() {})');
      });
      context.resource = {'src': 'js/bar.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{amd: 'lib:bar'}, {amd: 'bar'}]);
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

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function() {}',
            ')();\n'
          ]);
          done();
        });
    });
    it('should handle non-define content', function(done) {
      defineSource = 'define(function() {});var foo;';

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function() {}',
            ')();\n',
            'var foo;'
          ]);
          done();
        });
    });
    it('should lookup global define dependencies', function(done) {
      context.platformCache.amdAppModules.baz = true;
      defineSource = 'define(["baz"], function(baz) {})';

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function(baz) {}',
            ')(wmd["baz"]);\n'
          ]);
          done();
        });
    });
    it('should lookup local define dependencies', function(done) {
      appModule = false;
      context.fileCache.amdFileModules.baz = true;
      defineSource = 'define(["baz"], function(baz) {})';

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function(baz) {}',
            ')(wmd["baz"]);\n'
          ]);
          done();
        });
    });
    it('should pass undefined for non-amd references', function(done) {
      context.fileCache.amdFileModules.noamd = false;
      defineSource = 'define(["noamd"], function(baz) {})';

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function(baz) {}',
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

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
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
      context.fileCache.amdFileModules['view!baz'] = 1;
      context.platformCache.amdAppModules['view!boz'] = true;
      defineSource = 'define(["view!baz", "view!boz"], function(baz, boz) {})';

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["define"] = (',
            'function(baz, boz) {}',
            ')(lwmd[1], Thorax.Views["boz"]);\n'
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
      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {src: 'templates/foo.handlebars'},
            'wmd["define"] = (',
            'function(foo) {}',
            ')(Handlebars.templates["foo"]);\n'
          ]);
          done();
        });
    });
    it('should lookup template resource in library', function(done) {
      context.resource = {src: 'js/define.js', library: {name: 'lib', root: 'foo/'}};

      defineSource = 'define(["hbs!foo"], function(foo) {})';
      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            {src: 'foo/templates/foo.handlebars', library: {name: 'lib', root: 'foo/'}},
            'wmd["lib:define"] = (',
            'function(foo) {}',
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
      context.fileCache.amdFileModules['helper!foo'] = true;

      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'Handlebars.registerHelper("define", (',
            'function(foo) {}',
            ')(Handlebars.helpers["foo"]));\n'
          ]);
          context.fileCache.knownHelpers.should.eql(['define']);
          done();
        });
    });
    it('should output global known helpers', function(done) {
      context.config.attributes.templates = {
        knownHelpers: []
      };
      defineSource = 'defineHelper(function() {})';
      appModule = true;

      amd.resourceList(
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
        lookup: function(name, isAppModule, context) {
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
      amd.resourceList(
        context, next,
        function(err, resources) {
          amd.loaders.custom.resource.should.have.been.calledWith('baz');

          resources.should.eql([
            {src: 'resource_baz'},
            {amd: 'foo/bar'}
          ]);
          done();
        });
    });
    it('should allow for custom output mechanisms', function(done) {
      amd.defaultLoader.output.restore();

      appModule = false;
      context.fileCache.amdFileModules['custom!baz'] = true;
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["foo/bar"] = (',
            'function(baz) {}',
            ')(lookie_there_baz);\n'
          ]);
          done();
        });
    });

    it('should allow for custom lookup mechanisms from module', function(done) {
      amd.defaultLoader.output.restore();

      appModule = false;
      context.fileCache.amdFileModules['custom!baz'] = true;
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["foo/bar"] = (',
            'function(baz) {}',
            ')(lookie_there_baz);\n'
          ]);
          done();
        });
    });
    it('should allow for custom lookup mechanisms from global', function(done) {
      amd.defaultLoader.output.restore();

      appModule = true;
      context.fileCache.amdFileModules['custom!baz'] = true;
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
        context, next,
        function(err, resources) {
          mapResources(resources).should.eql([
            'wmd["foo/bar"] = (',
            'function(baz) {}',
            ')(lookie_here_baz);\n'
          ]);
          done();
        });
    });
  });

  describe('config change', function() {
    it('should detect when style config changed');
    it('should detect when applicaiton module impacts modules');
  });
});

function mapResources(resources) {
  return _.map(resources, function(resource) { return resource.stringValue || resource; });
}
