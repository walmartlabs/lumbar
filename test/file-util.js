var assert = require('assert'),
    fu = require('../lib/fileUtil');

describe('file-util', function() {
  afterEach(function() {
    fu.lookupPath('');
  });

  describe('#resolvePath', function() {
    it('should resolve paths', function() {
      fu.lookupPath('foo/bar');

      assert.equal(fu.resolvePath('foo'), 'foo/bar/foo');
      assert.equal(fu.resolvePath('foo/bar/foo'), 'foo/bar/foo');
      assert.equal(fu.resolvePath('/foo'), '/foo');
      assert.equal(fu.resolvePath('c:\\foo'), 'c:\\foo');
      assert.equal(fu.resolvePath('c:/foo'), 'c:/foo');
    });
  });

  describe('#makeRelative', function() {
    it('should make paths relative', function() {
      fu.lookupPath('foo/bar');

      assert.equal(fu.makeRelative('foo'), 'foo');
      assert.equal(fu.makeRelative('foo/bar/foo'), 'foo');
      assert.equal(fu.makeRelative('foo/baro/foo'), 'foo/baro/foo');
      assert.equal(fu.makeRelative('/foo'), '/foo');
      assert.equal(fu.makeRelative('c:\\foo'), 'c:\\foo');
      assert.equal(fu.makeRelative('c:/foo'), 'c:/foo');
    });
  });

  describe('#fileList', function() {
    it('should resolve single files', function(done) {
      fu.fileList('test/file-util.js', function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, ['test/file-util.js']);
        done();
      });
    });

    it('should resolve immediate files', function(done) {
      fu.lookupPath('test');
      fu.fileList('file-util.js', function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, ['file-util.js']);
        done();
      });
    });

    it('should not filter explicit file entrys', function(done) {
      fu.fileList('test/file-util.js', /notjason/, function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, ['test/file-util.js']);
        done();
      });
    });

    it('should mark missing files as enoent', function(done) {
      fu.fileList('foo-bar-baz', function(err, files) {
        assert.deepEqual(files, [{src: 'foo-bar-baz', enoent: true}]);

        done();
      });
    });

    it('should return duplicates only once', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', 'file-util.js', 'artifacts/router.json', 'file-util.js'], function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, ['file-util.js', 'artifacts/router.json']);
        done();
      });
    });

    it('should resolve the files in a directoy', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', 'artifacts/js'], function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, [
          'file-util.js',
          {dir: 'artifacts/js'},
          {src: 'artifacts/js/base.js', srcDir: 'artifacts/js'},
          {dir: 'artifacts/js/home', srcDir: 'artifacts/js'},
          {src: 'artifacts/js/home/home.js', srcDir: 'artifacts/js'},
          {src: 'artifacts/js/iphone.js', srcDir: 'artifacts/js'},
          {src: 'artifacts/js/web.js', srcDir: 'artifacts/js'}
        ]);
        done();
      });
    });

    it('should filter directories by extension', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', 'artifacts'], /js\/.*\.js$/, function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, [
          'file-util.js',
          {dir: 'artifacts'},
          {dir: 'artifacts/config', srcDir: 'artifacts'},
          {dir: 'artifacts/images', srcDir: 'artifacts'},
          {dir: 'artifacts/js', srcDir: 'artifacts'},
          {src: 'artifacts/js/base.js', srcDir: 'artifacts'},
          {dir: 'artifacts/js/home', srcDir: 'artifacts'},
          {src: 'artifacts/js/home/home.js', srcDir: 'artifacts'},
          {src: 'artifacts/js/iphone.js', srcDir: 'artifacts'},
          {src: 'artifacts/js/web.js', srcDir: 'artifacts'},
          {dir: 'artifacts/node_modules', srcDir: 'artifacts'},
          {dir: 'artifacts/node_modules/json-plugins-test-plugin', srcDir: 'artifacts'},
          {dir: 'artifacts/styles', srcDir: 'artifacts'},
          {dir: 'artifacts/templates', srcDir: 'artifacts'}
        ]);
        done();
      });
    });

    it('should include resource flags on lookup', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', {src: 'artifacts', global: true}, {router: true}], /js\/.*\.js$/, function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, [
          'file-util.js',
          { dir: 'artifacts', global: true},
          { dir: 'artifacts/config', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/images', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/js', global: true, srcDir: 'artifacts'},
          { src: 'artifacts/js/base.js', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/js/home', global: true, srcDir: 'artifacts'},
          { src: 'artifacts/js/home/home.js', global: true, srcDir: 'artifacts'},
          { src: 'artifacts/js/iphone.js', global: true, srcDir: 'artifacts'},
          { src: 'artifacts/js/web.js', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/node_modules', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/node_modules/json-plugins-test-plugin', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/styles', global: true, srcDir: 'artifacts'},
          { dir: 'artifacts/templates', global: true, srcDir: 'artifacts'},
          {router: true}
        ]);

        done();
      });
    });

    it('should support resource only lists', function(done) {
      fu.lookupPath('test');
      fu.fileList([{router: true}], /js\/.*\.js$/, function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, [{router: true}]);

        done();
      });
    });

    it('should support empty results', function(done) {
      fu.lookupPath('test');
      fu.fileList([], /js\/.*\.js$/, function(err, files) {
        if (err) {
          throw err;
        }

        assert.deepEqual(files, []);

        done();
      });
    });
  });

  describe('file caches', function() {
    var fs = require('fs'),
        originalReadFile = fs.readFile,
        originalReaddir = fs.readdir,
        count = 0;
    before(function() {
      fs.readFile = function(path, callback) {
        count++;
        callback(undefined, 'data');
      };
      fs.readdir = function(path, callback) {
        count++;
        callback(undefined, 'data');
      };
    });
    after(function() {
      fs.readFile = originalReadFile;
    });
    beforeEach(function() {
      count = 0;
    });

    describe('#readdir', function() {
      it('should read using cache', function() {
        fu.resetCache();
        fu.readFile('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 1);
        fu.readFile('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 1);

        fu.resetCache();
        fu.readFile('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 2);
      });
    });

    describe('#readdir', function() {
      it('should read from dir cache', function() {
        fu.resetCache();
        fu.readdir('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 1);
        fu.readdir('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 1);

        fu.resetCache();
        fu.readdir('foo', function(err, data) {
          assert.equal(data, 'data');
        });
        assert.equal(count, 2);

        fs.readdir = originalReaddir;
      });
    });

    describe('#readFileArtifact', function() {
      it('should maintain cached artifact', function() {
        fu.resetCache();
        fu.readFileArtifact('foo', 'bar', function(err, data) {
          assert.equal(data.data, 'data');
          assert.equal(data.artifact, undefined);
        });
        assert.equal(count, 1);
        fu.setFileArtifact('foo', 'bar', 'baz');


        fu.readFileArtifact('foo', 'bar', function(err, data) {
          assert.equal(data.data, 'data');
          assert.equal(data.artifact, 'baz');
        });
        assert.equal(count, 1);

        fu.resetCache();
        fu.readFileArtifact('foo', 'bar', function(err, data) {
          assert.equal(data.data, 'data');
          assert.equal(data.artifact, undefined);
        });
        assert.equal(count, 2);
      });
    });
  });
});
