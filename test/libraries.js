var fs = require('fs'),
    Libraries = require('../lib/libraries'),
    should = require('should');

describe('Libraries', function() {
  describe('#initialize', function() {
    it('should remove duplicates', function() {
      var library = new Libraries({libraries: ['bower_components/foo', 'baz']}),
          paths = [];
      library.load = function(context, path, callback) {
        paths.push(path);
        callback();
      };
      library.bowerLibraries = function() {
        return ['bower_components/foo', 'bower_components/baz'];
      };

      library.initialize({config: {attributes: {libraries: ['bower_components/foo', 'bar', 'foo/../baz']}}});
      paths.should.eql(['bower_components/foo', 'baz', 'bar', 'bower_components/baz']);
    });
  });
  describe('#bowerLibraries', function() {
    beforeEach(function() {
      require('bower').config.directory = 'bower_components';
    });

    var readdirSync = fs.readdirSync,
        statSync = fs.statSync,

        context = {
          event: {emit: function() {}}
        };
    before(function() {
      fs.statSync = function(path) {
        if (/bar\//.test(path)) {
          throw new Error();
        }
      };
    });
    after(function() {
      fs.readdirSync = readdirSync;
      fs.statSync = statSync;
    });

    it('should return all modules in bower directory', function() {
      fs.readdirSync = function(path) {
        return ['foo', 'bar', 'baz'];
      };

      var library = new Libraries();
      library.bowerLibraries(context).should.eql(['bower_components/foo', 'bower_components/baz']);
    });
    it('should not error on fs error', function() {
      fs.readdirSync = function(path) {
        throw new Error();
      };

      var library = new Libraries();
      should.not.exist(library.bowerLibraries(context));
    });
  });
});