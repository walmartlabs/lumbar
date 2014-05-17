var Config = require('../lib/config');

describe('config', function() {
  it('should fail if parsing error occurs', function() {
    (function() {
      Config.readConfig(__dirname + '/artifacts/invalid.json');
    }).should.throw(/Failed to load config .*invalid.json: Line: 3 Column: 4 - Unexpected token ;/);
  });

  it('should fail if no modules are defined', function() {
    (function() {
      Config.create({});
    }).should.throw(/No modules object defined/);
  });

  it('should serialize config', function() {
    var config = Config.create({
      application: {
        module: 'foo',
        name: 'Name!'
      },
      modules: {
        foo: {
          scripts: [
            "foo",
            {template: "bar"}
          ]
        }
      }
    });

    config.serialize().should.eql({
        application: {
          module: 'foo',
          name: 'Name!'
        },
        modules: {
          foo: {
            scripts: [
              "foo",
              {template: "bar"}
            ]
          }
        },
        packages: {
          web: {
            name: ''
          }
        }
      });
  });

  describe('application module', function() {
    var config = Config.create({
      application: {
        module: 'foo',
        name: 'Name!'
      },
      modules: {}
    });

    it('should identify the app module', function() {
      config.isAppModule('foo').should.be.true;
      config.isAppModule({name: 'foo'}).should.be.true;

      config.isAppModule('bar').should.be.false;
      config.isAppModule({name: 'bar'}).should.be.false;
    });
    it('should provide the scoped module name', function() {
      config.scopedAppModuleName('foo').should.equal('module.exports');
      config.scopedAppModuleName({name: 'foo'}).should.equal('module.exports');

      config.scopedAppModuleName('bar').should.equal('Name!');
      config.scopedAppModuleName({name: 'bar'}).should.equal('Name!');
    });
  });
});
