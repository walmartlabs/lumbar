var FileMap = require('../../lib/util/file-map'),
    sinon = require('sinon');

describe('file-map', function() {
  describe('#add', function() {
    it('should add to content', function() {
      var map = new FileMap('foo');
      map.add(undefined, ';;');
      map.content().should.equal(';;');
    });
    it('should clear cache on add', function() {
      var map = new FileMap('foo');
      map._sourceMap = 'foo';

      map.add(undefined, ';;');
      map._sourceMap.should.equal('');
    });
    it('should update offsets', function() {
      var map = new FileMap('foo');
      map.add(undefined, ';;');
      map.line.should.equal(1);
      map.column.should.equal(3);

      map.add(undefined, '\n;;');
      map.line.should.equal(2);
      map.column.should.equal(3);

      map.add(undefined, ';;');
      map.line.should.equal(2);
      map.column.should.equal(5);

      map.add(undefined, '\n;;\n');
      map.line.should.equal(4);
      map.column.should.equal(1);
    });
    it('should cache named content', function() {
      var map = new FileMap('foo');
      map.add('bar', ';;\n::\n');
      map.contentCache.bar.should.eql([
        ';;',
        '::',
        ''
      ]);
    });
    it('should add source mapping', function() {
      var map = new FileMap('foo');
      sinon.stub(map.generator, 'addMapping');

      map.add('bar', ';;\n::');
      map.add('baz', ';;\n');

      map.generator.addMapping.args[0][0].should.eql({
        source: 'bar',
        generated: {line: 1, column: 1},
        original: {line: 1, column: 1}
      });
      map.generator.addMapping.args[1][0].should.eql({
        source: 'bar',
        generated: {line: 2, column: 1},
        original: {line: 2, column: 1}
      });
      map.generator.addMapping.args[2][0].should.eql({
        source: 'baz',
        generated: {line: 2, column: 3},
        original: {line: 1, column: 1}
      });
    });
  });
  describe('#messageContext', function() {
    var map;
    beforeEach(function() {
      map = new FileMap('foo');
      map.add('foo', 'foo1\nfoo2\nfoo3');   // 3, 4
      map.add(undefined, ';;');   // 3, 6
      map.add('bar', 'bar1\nbar2\nbar3\nbar1\nbar2\nbar3\nbar1\nbar2\nbar3\n');
    });

    it('should output context', function() {
      map.context(1, 1).should.eql({
        file: 'foo',
        line: 1,
        column: 1,
        context: '1:  foo1\n2   foo2\n3   foo3'
      });
    });

    it('should output proper gutter width', function() {
      map.context(10, 1).should.eql({
        file: 'bar',
        line: 8,
        column: 1,
        context: ' 6   bar3\n 7   bar1\n 8:  bar2\n 9   bar3\n10   '
      });
    });
    it('should output original lines for unnamed contexts', function() {
      map.context(3, 5).should.eql({
        file: '<generated>',
        line: 3,
        column: 5
      });
    });
    it('should clip context to the file', function() {
      map.context(3, 7).should.eql({
        file: 'bar',
        line: 1,
        column: 1,
        context: '1:  bar1\n2   bar2\n3   bar3'
      });
      map.context(11, 1).should.eql({
        file: 'bar',
        line: 9,
        column: 1,
        context: ' 7   bar1\n 8   bar2\n 9:  bar3\n10   '
      });
    });
  });
});
