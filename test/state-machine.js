var build = require('../lib/build'),
    configLoader = require('../lib/config'),
    Context = require('../lib/context'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    fu = require('../lib/fileUtil'),
    Libraries = require('../lib/libraries'),
    plugins = require('../lib/plugin'),
    sinon = require('sinon'),
    stateMachine = require('../lib/state-machine');

describe('state machine', function() {
  var event,
      context,
      plugin;

  beforeEach(function() {
    this.stub(plugins, 'create', function() {
      return plugin;
    });

    event = new EventEmitter();
    plugin = {
      initialize: function() {},
      loadConfig: this.spy(function(context, callback) { callback(); }),
      modes: function() { return ['foo', 'bar']; },
      outputConfigs: function(context, callback) { callback(undefined, ['fu', 'gazi']); },
      module: this.spy(function(context, callback) { callback(); }),
      modeComplete: this.spy(function(context, callback) { callback(); })
    };

    var config = configLoader.create({
          "packages": {
            "web": {
              "platforms": [ "web" ],
              "combine": false
            },
            "native-home": {
              "platforms": [ "android", "iphone" ],
              "modules": [ "base", "home" ],
              "combine": true
            }
          },
          "modules": {
            "home": {},
            "base": {}
          }
        });
    context = new Context({}, config, plugin, {}, event);
  });

  describe('#loadConfig', function() {
    var isDir,
        config;
    beforeEach(function() {
      var test = this;

      isDir = true;
      config = {
        modules: { 'foo': {} }
      };
      this.stub(fu, 'ensureDirs', function(path, callback) {
        test.stub(fs, 'statSync', function() {
          return {
            isDirectory: function() { return isDir; }
          };
        });
        callback();
      });
    });

    it('should create context', function() {
      stateMachine.loadConfig(config, event, {outdir: 'foo'}, function(err, context) {
        should.not.exist(err);
        should.exist(context);
      });
      plugin.loadConfig.should.have.been.calledOnce;
    });
    it('should emit config event', function() {
      var spy = this.spy(function(_config) {
        _config.attributes.should.eql(config);
      });
      event.on('config', spy);
      stateMachine.loadConfig(config, event, {outdir: 'foo'}, function(err, context) {});
      spy.should.have.been.calledOnce;
    });
    it('should emit logging event', function() {
      var spy = this.spy(function(config) {
        config.should.match(/Finalized config/);
      });
      event.on('log', spy);
      stateMachine.loadConfig(config, event, {outdir: 'foo', verbose: true}, function(err, context) {});
      spy.should.have.been.called;
    });
    it('should handle thrown errors', function() {
      plugin.initialize = function() {
        throw new Error('FAILED!');
      };
      stateMachine.loadConfig(config, event, {}, function(err) {
        err.should.match(/FAILED!/);
      });
    });
    it('should handle library init errors', function() {
      this.stub(Libraries.prototype, 'initialize', function(context, callback) { callback(new Error('FAILED!')); });
      stateMachine.loadConfig(config, event, {}, function(err) {
        err.should.match(/FAILED!/);
      });
    });
    it('should handle loadConfig errors', function() {
      plugin.loadConfig = function(context, callback) { callback(new Error('FAILED!')); };
      stateMachine.loadConfig(config, event, {}, function(err) {
        err.should.match(/FAILED!/);
      });
    });
    it('should handle missing directory error', function() {
      stateMachine.loadAndInitDir(config, event, {}, function(err, context) {
        err.should.match(/Output must be defined/);
      });
    });
    it('should handle directory errors', function() {
      isDir = false;

      stateMachine.loadAndInitDir(config, event, {outdir: 'foo'}, function(err, context) {
        err.should.match(/Output must be a directory/);
      });
    });
  });

  describe('#buildPackages', function() {
    beforeEach(function() {
      this.stub(stateMachine, 'buildPlatform');
    });
    function built() {
      return stateMachine.buildPlatform.args.map(function(arg) {
        return arg[0].package + ':' + arg[0].platform + ':' + arg[0].module;
      });
    }

    it('should iterate over all platforms and packages', function() {
      stateMachine.buildPackages(context, undefined, function() {});

      built().should.eql(['web:web:undefined', 'native-home:android:undefined', 'native-home:iphone:undefined']);
    });
    it('should iterate over platforms and packages', function() {
      stateMachine.buildPackages(context, 'web', function() {});

      built().should.eql(['web:web:undefined']);
    });

    it('should accept string module name', function() {
      stateMachine.buildPackages(context, 'native-home', 'home', function() {});

      built().should.eql(['native-home:android:home', 'native-home:iphone:home']);
    });
    it('should accept array of module names', function() {
      stateMachine.buildPackages(context, 'native-home', ['base', 'home'], function() {});

      built().should.eql([
        'native-home:android:base', 'native-home:iphone:base',
        'native-home:android:home', 'native-home:iphone:home'
      ]);
    });
    it('should treat empty array as all modules', function() {
      stateMachine.buildPackages(context, 'native-home', [], function() {});

      built().should.eql(['native-home:android:undefined', 'native-home:iphone:undefined']);
    });

    it('should accept package name via hash', function() {
      stateMachine.buildPackages(context, {package: 'web'}, function() {});

      built().should.eql(['web:web:undefined']);
    });
  });
  describe('#buildPlatform', function() {
    beforeEach(function() {
      this.stub(stateMachine, 'buildMode');
    });
    function built() {
      return stateMachine.buildMode.args.map(function(arg) {
        return arg[0];
      });
    }

    it('should iterate over all modes', function() {
      stateMachine.buildPlatform(context, undefined, function() {});

      built().should.eql(['foo', 'bar']);
    });
    it('should exec a specific mode', function() {
      context.mode = 'scripts';
      stateMachine.buildPlatform(context, function() {});

      built().should.eql(['scripts']);
    });
  });

  describe('#buildMode', function() {
    beforeEach(function() {
      this.stub(stateMachine, 'buildModule');
      context.package = 'native-home';
    });
    function built() {
      return stateMachine.buildModule.args.map(function(arg) {
        return arg[0].fileConfig + ':' + arg[0].module;
      });
    }

    it('should build modules', function() {
      stateMachine.buildMode('foo', context, function() {});
      built().should.eql(['fu:home', 'fu:base', 'gazi:home', 'gazi:base']);
    });

    it('should use passed fileConfig', function() {
      context.fileConfig = 'bar';
      stateMachine.buildMode('foo', context, function() {});
      built().should.eql(['bar:home', 'bar:base']);
    });
    it('should build passed modules', function() {
      context.fileConfig = 'bar';
      context.module = 'base';
      stateMachine.buildMode('foo', context, function() {});
      built().should.eql(['bar:base']);
    });

    it('should handle outputConfigs error', function() {
      plugin.outputConfigs = function(context, callback) { callback(new Error('FAILED')); };
      stateMachine.buildMode('foo', context, function(err) {
        err.should.match(/FAILED/);
      });
    });
    it('should handle buildModule error', function() {
      stateMachine.buildModule.restore();
      this.stub(stateMachine, 'buildModule', function(context, callback) { callback(new Error('FAILED')); });

      stateMachine.buildMode('foo', context, function(err) {
        err.should.match(/FAILED/);
      });
    });

    it('should call modeComplete', function() {
      stateMachine.buildModule.restore();
      this.stub(stateMachine, 'buildModule', function(context, callback) { callback(); });

      context.fileConfig = 'bar';
      context.module = 'base';
      stateMachine.buildMode('foo', context, function() {});
      plugin.modeComplete.should.have.been.calledOnce;
    });
  });

  describe('#buildModule', function() {
    beforeEach(function() {
      this.stub(stateMachine, 'processResources');
    });
    function built() {
      return stateMachine.processResources.args.map(function(arg) {
        return arg[1];
      });
    }

    it('should error on missing module', function() {
      context.module = 'fugazi';
      stateMachine.buildModule(context, function(err) {
        err.should.match(/Unable to find module "fugazi"/);
      });
    });
    it('should iterate over resources', function() {
      var resources = ['foo', 'bar'];
      this.stub(build, 'loadResources', function(context, callback) { callback(undefined, resources); });

      context.module = 'home';
      stateMachine.buildModule(context, function() {});

      stateMachine.processResources.should.have.been.calledWith(context, resources);
    });
    it('should use passed resource', function() {
      var resources = ['foo', 'bar'];
      this.stub(build, 'loadResources', function(context, callback) { callback(new Error('FAILED')); });

      context.module = 'home';
      context.resource = 'baz';
      stateMachine.buildModule(context, function() {});

      stateMachine.processResources.should.have.been.calledWith(context, ['baz']);
    });
    it('should handle load error', function() {
      var resources = ['foo', 'bar'];
      this.stub(build, 'loadResources', function(context, callback) { callback(new Error('FAILED')); });

      context.module = 'home';
      stateMachine.buildModule(context, function(err) {
        err.should.match(/FAILED/);
      });

      stateMachine.processResources.should.not.have.been.called;
    });
  });
  describe('#processResources', function() {
    it('should call module plugins', function() {
      this.stub(build, 'processResources', function(resources, context, callback) {
        callback(undefined, resources);
      });

      var resources = ['foo', 'bar'],
          stub = this.spy();
      stateMachine.processResources(context, resources, stub);

      plugin.module.should.have.been.calledOnce;
      plugin.module.args[0][0].moduleResources.should.equal(resources);

      stub.should.have.been.calledOnce;
      stub.should.have.been.calledWith(undefined);
    });
    it('should handle errors', function() {
      this.stub(build, 'processResources', function(resources, context, callback) {
        callback(new Error('FAILED!'), resources);
      });

      var resources = ['foo', 'bar'],
          stub = this.spy();
      stateMachine.processResources(context, resources, stub);

      plugin.module.should.not.have.been.called;

      stub.should.have.been.calledOnce;
      stub.should.have.been.calledWith(sinon.match.instanceOf(Error));
    });
  });
});
