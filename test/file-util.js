var fu = require('../lib/fileUtil');

describe('file-util', function() {
  afterEach(function() {
    fu.lookupPath('');
  });

  describe('#resolvePath', function() {
    it('should resolve paths', function() {
      fu.lookupPath('foo/bar');

      fu.resolvePath('foo').should.equal('foo/bar/foo');
      fu.resolvePath('foo/bar/foo').should.equal('foo/bar/foo');
      fu.resolvePath('/foo').should.equal('/foo');
      fu.resolvePath('c:\\foo').should.equal('c:\\foo');
      fu.resolvePath('c:/foo').should.equal('c:/foo');
    });
  });

  describe('#makeRelative', function() {
    it('should make paths relative', function() {
      fu.lookupPath('foo/bar');

      fu.makeRelative('foo').should.equal('foo');
      fu.makeRelative('foo/bar/foo').should.equal('foo');
      fu.makeRelative('foo/baro/foo').should.equal('foo/baro/foo');
      fu.makeRelative('/foo').should.equal('/foo');
      fu.makeRelative('c:\\foo').should.equal('c:\\foo');
      fu.makeRelative('c:/foo').should.equal('c:/foo');
    });
  });

  describe('#fileList', function() {
    it('should resolve single files', function(done) {
      fu.fileList('test/file-util.js', function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql(['test/file-util.js']);
        done();
      });
    });

    it('should resolve immediate files', function(done) {
      fu.lookupPath('test');
      fu.fileList('file-util.js', function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql(['file-util.js']);
        done();
      });
    });

    it('should not filter explicit file entrys', function(done) {
      fu.fileList('test/file-util.js', /notjason/, function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql(['test/file-util.js']);
        done();
      });
    });

    it('should mark missing files as enoent', function(done) {
      fu.fileList('foo-bar-baz', function(err, files) {
        files.should.eql([{src: 'foo-bar-baz', enoent: true}]);

        done();
      });
    });

    it('should return duplicates only once', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', 'file-util.js', 'example/lumbar.json', 'file-util.js'], function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql(['file-util.js', 'example/lumbar.json']);
        done();
      });
    });

    it('should resolve the files in a directoy', function(done) {
      fu.lookupPath('test');
      fu.fileList(['file-util.js', 'artifacts/js'], function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql([
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

        files.should.eql([
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
          {dir: 'artifacts/library', srcDir: 'artifacts'},
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

        files.should.eql([
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
          { dir: 'artifacts/library', global: true, srcDir: 'artifacts'},
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

        files.should.eql([{router: true}]);

        done();
      });
    });

    it('should support empty results', function(done) {
      fu.lookupPath('test');
      fu.fileList([], /js\/.*\.js$/, function(err, files) {
        if (err) {
          throw err;
        }

        files.should.eql([]);

        done();
      });
    });
  });

  describe('file caches', function() {
    var fs = require('fs'),
        count = 0;
    beforeEach(function() {
      count = 0;
      this.stub(fs, 'readFile', function(path, callback) {
        count++;
        callback(undefined, 'data');
      });
      this.stub(fs, 'readdir', function(path, callback) {
        count++;
        callback(undefined, 'data');
      });
    });

    describe('#readdir', function() {
      it('should read using cache', function() {
        fu.resetCache();
        fu.readFile('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(1);
        fu.readFile('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(1);

        fu.resetCache();
        fu.readFile('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(2);
      });
    });

    describe('#readdir', function() {
      it('should read from dir cache', function() {
        fu.resetCache();
        fu.readdir('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(1);
        fu.readdir('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(1);

        fu.resetCache();
        fu.readdir('foo', function(err, data) {
          data.should.equal('data');
        });
        count.should.equal(2);
      });
    });

    describe('#readFileArtifact', function() {
      it('should maintain cached artifact', function() {
        fu.resetCache();
        fu.readFileArtifact('foo', 'bar', function(err, data) {
          data.data.should.equal('data');
          should.not.exist(data.artifact);
        });
        count.should.equal(1);
        fu.setFileArtifact('foo', 'bar', 'baz');


        fu.readFileArtifact('foo', 'bar', function(err, data) {
          data.data.should.equal('data');
          data.artifact.should.equal('baz');
        });
        count.should.equal(1);

        fu.resetCache();
        fu.readFileArtifact('foo', 'bar', function(err, data) {
          data.data.should.equal('data');
          should.not.exist(data.artifact);
        });
        count.should.equal(2);
      });
    });
  });
});
