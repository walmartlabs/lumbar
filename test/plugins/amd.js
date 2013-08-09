var _ = require('underscore'),
    amd = require('../../lib/plugins/amd'),
    build = require('../../lib/build'),
    fu = require('../../lib/fileUtil'),
    fs = require('fs');

describe('amd plugin', function() {
  var appModule,
      context,
      expectedCache,
      next;
  beforeEach(function() {
    fu.resetCache();

    appModule = false;
    next = this.spy(function(callback) { callback(undefined, [context.resource]); });
    context = {
      platformCache: {
        amdAppModules: {}
      },
      fileCache: {},
      config: {
        isAppModule: function() {
          return appModule;
        },
        attributes: {
          amd: true
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
          view: true,
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
          view: true,
          source: 'function() {}'
        }],
        dependencies: ['view!baz']
      }
    };

    this.stub(fu, 'setFileArtifact');
    this.stub(fs, 'readFile', function(path, callback) {
      if (/js\/foo\/foo.js$/.test(path)) {
        callback(undefined, 'defineView(["bar"], function() {})');
      } else {
        callback(undefined, 'defineView(["view!baz"], function() {})');
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
          view: true,
          source: 'function() {}'
        }],
        dependencies: ['bar']
      };

      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/foo/foo.js', 'amd', expectedCache['foo/foo']);
          fu.setFileArtifact.should.have.been.calledWith('js/bar.js', 'amd', expectedCache['bar']);
          fu.setFileArtifact.should.have.been.calledWith('js/views/baz.js', 'amd', expectedCache['views/baz']);
          done();
        });
    });
  });

  describe('dependencies', function() {
    it('should insert dependencies', function(done) {
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/views/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
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
          should.not.exist(context.fileCache.amdFileModules);
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
              resources.should.eql(['js/views/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
              fs.readFile.should.have.been.calledOnce;
              done();
            });
        });
    });
    it('should not insert dependencies included in application module', function(done) {
      context.platformCache.amdAppModules['view!baz'] = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/bar.js', {src: 'js/foo/foo.js'}]);
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
          resources.should.eql(['js/views/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
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
          resources.should.eql(['js/views/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);

          amd.resourceList(
            context, next,
            function(err, resources) {
              resources.should.eql([]);
              done();
            });
        });
    });
  });

  describe('loading', function() {
    beforeEach(function() {
      amd.loaders.custom = {
        resource: this.spy(function(name) {
          return {src: 'resource_' + name};
        }),
        definition: function(name, content, isGlobal) {
        },
        loader: function(name, isGlobal) {
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
            view: true,
            source: 'function() {}'
          }],
          dependencies: ['custom!baz']
        }
      };

      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        if (/js\/foo\/foo.js$/.test(path)) {
          callback(undefined, 'defineView(["bar"], function() {})');
        } else {
          callback(undefined, 'defineView(["custom!baz"], function() {})');
        }
      });
    });
    afterEach(function() {
      delete amd.loaders.custom;
    });

    it('should allow for custom resource lookup', function(done) {
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
        context, next,
        function(err, resources) {
          amd.loaders.custom.resource.should.have.been.calledWith('baz');

          next.should.have.been.calledOnce;
          fu.setFileArtifact.should.have.been.calledWith('js/foo/bar.js', 'amd', expectedCache['foo/bar']);

          resources.should.eql([
            {src: 'resource_baz'},
            'js/foo/bar.js'
          ]);
          done();
        });
    });
    it('should allow for custom declaration mechanisms');

    it('should allow for custom loading mechanisms from module');
    it('should allow for custom loading mechanisms from global');
  });

  describe('config change', function() {
    it('should detect when style config changed');
    it('should detect when applicaiton module impacts modules');
  });
});
