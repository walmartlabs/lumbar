var lib = require('../lib'),
    lumbar = require('../../lib/lumbar');

describe('many-to-one-ouput plugin', function() {
  var config = {};
  lib.mockFileList(config);
  lib.mockStat(config);

  beforeEach(function() {
    this.stub(lumbar, 'combine', function(context, files, output, minimize, noSeparator, callback) { callback(undefined, 'foo'); });
  });
  it('should output file', function(done) {
    var module = {
      scripts: [
        'js/views/test.js'
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {}, function() {
      lumbar.combine.args[0][1].should.eql([{src: 'js/views/test.js'}]);
      done();
    });
  });
  it('should filter duplicated resources in the same module', function(done) {
    var module = {
      scripts: [
        'js/views/test.js',
        'js/views/test.js'
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {}, function() {
      lumbar.combine.args[0][1].should.eql([{src: 'js/views/test.js'}]);
      done();
    });
  });
  it('should not filter flaged duplicated resources', function(done) {
    var module = {
      scripts: [
        'js/views/test.js',
        {src: 'js/views/test.js', duplicate: true}
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {}, function() {
      lumbar.combine.args[0][1].should.eql([
        {src: 'js/views/test.js'},
        {src: 'js/views/test.js', duplicate: true}
      ]);
      done();
    });
  });
  it('should not filter config flaged duplicated resources', function(done) {
    var module = {
      scripts: [
        'js/views/test.js',
        'js/views/test.js'
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {filterDuplicates: false}, function() {
      lumbar.combine.args[0][1].should.eql([
        {src: 'js/views/test.js'},
        {src: 'js/views/test.js'}
      ]);
      done();
    });
  });
  it('should not filter duplicates in different scopes', function(done) {
    var module = {
      scripts: [
        {src: 'js/views/test.js', global: true},
        'js/views/test.js'
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {filterDuplicates: false}, function() {
      lumbar.combine.args[0][1].should.eql([
        {src: 'js/views/test.js', global: true},
        {src: 'js/views/test.js'}
      ]);
      done();
    });
  });
  it('should filter duplicates in global scope', function(done) {
    var module = {
      scripts: [
        {src: 'js/views/test.js', global: true},
        {src: 'js/views/test.js', global: true}
      ]
    };

    lib.pluginExec('scripts-output', 'scripts', module, [], {}, function() {
      lumbar.combine.args[0][1].should.eql([
        {src: 'js/views/test.js', global: true}
      ]);
      done();
    });
  });
});
