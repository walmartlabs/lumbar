var assert = require('assert'),
    fu = require('../lib/fileUtil');

exports['teardown'] = function(done) {
  fu.lookupPath('');
  done();
};

exports['resolve-path'] = function() {
  fu.lookupPath('foo/bar');

  assert.equal(fu.resolvePath('foo'), 'foo/bar/foo');
  assert.equal(fu.resolvePath('foo/bar/foo'), 'foo/bar/foo');
  assert.equal(fu.resolvePath('/foo'), '/foo');
  assert.equal(fu.resolvePath('c:\\foo'), 'c:\\foo');
  assert.equal(fu.resolvePath('c:/foo'), 'c:/foo');
};

exports['file-list-file'] = function(done) {
  fu.fileList('test/file-util.js', function(err, files) {
    if (err) {
      throw err;
    }

    assert.equal(files.length, 1);
    assert.equal(files[0], 'test/file-util.js');
    done();
  });
};

exports['file-list-file-lookup'] = function(done) {
  fu.lookupPath('test');
  fu.fileList('file-util.js', function(err, files) {
    if (err) {
      throw err;
    }

    assert.equal(files.length, 1);
    assert.equal(files[0], 'test/file-util.js');
    done();
  });
};

exports['file-list-file-no-filter'] = function(done) {
  fu.fileList('test/file-util.js', /notjason/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.equal(files.length, 1);
    assert.equal(files[0], 'test/file-util.js');
    done();
  });
};

exports['file-list-file-not-found'] = function(done) {
  fu.fileList('test/file-util.js.foo', function(err, files) {
    assert.equal(files, undefined);
    assert.equal(err.code, 'ENOENT');

    done();
  });
};
