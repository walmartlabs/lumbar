var _ = require('underscore'),
    lib = require('../lib');

describe('router plugin', function() {
  var module = {
    routes: {'foo': 'bar', 'baz': 'bat'},
    name: 'foo'
  };
  var config = {
    scope: 'none'
  };

  it('should inlcude route resource', function(done) {
    lib.pluginExec('router', 'scripts', module, [], config, function(resources, context) {
      _.pluck(resources, 'originalResource').should.eql([{routes: {'foo': 'bar', 'baz': 'bat'}}]);
      done();
    });
  });

  it('should output routes', function(done) {
    lib.pluginExec('router', 'scripts', module, [], config, function(resources, context) {
      resources[0](context, function(err, data) {
        if (err) {
          throw err;
        }

        data.should.eql({
          data: '/* router : foo */\nmodule.name = "foo";\nmodule.routes = {"foo":"bar","baz":"bat"};\n',
          generated: true,
          noSeparator: true
        });
      });
      done();
    });
  });
});
