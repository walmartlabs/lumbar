var serverScripts = require('../../lib/plugins/server-scripts');

describe('server scripts', function() {
  describe('#fileFilter', function() {
    it('should filter js and json', function() {
      var filter = serverScripts.fileFilter();
      filter.test('foo.js').should.be.true;
      filter.test('foo.json').should.be.true;
      filter.test('foo.jso').should.be.false;
    });
  });

  describe('#outputConfigs', function() {
    it('should output both config types', function() {
      serverScripts.outputConfigs(
          {config: {attributes: {server: true}}},
          function(callback) {
            callback(undefined, [{value: 1}, {value: 2}]);
          },
          function(err, ret) {
            should.not.exist(err);
            ret.should.eql([
              {value: 1, server: true},
              {value: 1, server: false},
              {value: 2, server: true},
              {value: 2, server: false}
            ]);
          });
    });
    it('should output only client files', function() {
      serverScripts.outputConfigs(
          {config: {attributes: {server: false}}},
          function(callback) {
            callback(undefined, [{value: 1}, {value: 2}]);
          },
          function(err, ret) {
            should.not.exist(err);
            ret.should.eql([
              {value: 1, server: false},
              {value: 2, server: false}
            ]);
          });
    });
    it('should handle errors', function() {
      serverScripts.outputConfigs(
          {},
          function(callback) {
            callback('foo', [{value: 1}, {value: 2}]);
          },
          function(err, ret) {
            err.should.equal('foo');
            should.not.exist(ret);
          });
    });
  });

  describe('#fileName', function() {
    it('should append suffix', function() {
      test(true, '-server');
    });
    it('should not append suffix', function() {
      test(false, '');
    });

    function test(server, name) {
      serverScripts.fileName(
          {fileConfig: {server: server}},
          function(callback) {
            callback(undefined, {path: 'foo'});
          },
          function(err, ret) {
            should.not.exist(err);
            ret.should.eql({path: 'foo' + name});
          });
    }
  });

  describe('#moduleResources', function() {
    it('should filter for server=true', function() {
      test({
          scripts: [
            {src: 'foo'},
            {src: 'bar', server: false},
            {src: 'baz', server: true},
            'gazi'
          ]
        },
        true,
        [
          {src: 'foo'},
          {src: 'baz', server: true},
          'gazi'
        ]);
    });
    it('should filter for server=false', function() {
      test({
          scripts: [
            {src: 'foo'},
            {src: 'bar', server: false},
            {src: 'baz', server: true},
            'gazi'
          ]
        },
        false,
        [
          {src: 'foo'},
          {src: 'bar', server: false},
          'gazi'
        ]);
    });
    it('should handle server array', function() {
      test({
          server: [
            'foo',
            {'src': 'bar', server: false},
            {'src': 'bat', server: true}
          ],
          scripts: [
            'fail'
          ]
        },
        true,
        [
          'foo',
          {src: 'bar', server: false},
          {src: 'bat', server: true}
        ]);
    });
    it('should ignore server array', function() {
      test({
          server: [
            'foo',
            {'src': 'bar', server: false},
            {'src': 'bat', server: true}
          ],
          scripts: [
            'winning'
          ]
        },
        false,
        [
          'winning'
        ]);
    });
    it('should handle no scripts', function() {
      test({}, true, []);
    });

    it('should handle errors', function() {
      serverScripts.moduleResources(
          {module: {}, fileConfig: {server: true}},
          function(callback) {
            callback('fail', module.scripts);
          },
          function(err, files) {
            err.should.equal('fail');
            should.not.exist(files);
          });
    });

    function test(module, server, expected) {
      serverScripts.moduleResources(
          {module: module, fileConfig: {server: server}, },
          function(callback) {
            callback(undefined, module.scripts);
          },
          function(err, files) {
            should.not.exist(err);
            files.should.eql(expected);
          });
    }
  });
});
