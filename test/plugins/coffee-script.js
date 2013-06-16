var fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    CoffeeScript = require('coffee-script'),
    lib = require('../lib');

describe('coffee-script plugin', function() {
  beforeEach(function() {
    fu.resetCache();
  });

  describe('output', function() {
    function doIt(done) {
      var module = {
        scripts: [
          {src: 'js/views/test.coffee'}
        ]
      };

      lib.pluginExec('coffe-script', 'scripts', module, [], {}, function(resources, context) {
        resources[0](context, done);
      });
    }
    it('should compile', function(done) {
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'foo\n');
      });

      this.stub(CoffeeScript, 'compile', function() { return 'wooo!'; });
      doIt(function(err, data) {
        data.should.eql({
          inputs: undefined,
          data: 'wooo!'
        });

        done();
      });
    });
    it('should handle errors', function(done) {
      this.stub(fs, 'readFile', function(path, callback) {
        callback(new Error('You failed'));
      });

      doIt(function(err, data) {
        err.should.be.instanceOf(Error);

        done();
      });
    });
  });
});
