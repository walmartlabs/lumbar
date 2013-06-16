var parser = require('../../lib/util/define-parser');

describe('define-parser', function() {
  function loc(startLine, startColumn, endLine, endColumn) {
    return {start: {line: startLine, column: startColumn}, end: {line: endLine, column: endColumn}};
  }

  describe('defineView', function() {
    it('should parse name', function() {
      parser("defineView('name', [], function() {});").should.eql([
        {'view': 'name', deps: [], source: 'function() {}', loc: loc(1, 23, 1, 36)}
      ]);
    });
    it('should throw on non-literal name', function() {
      (function() {
        parser('defineView(name, [], function() {});');
      }).should.throw(/Expected view name to be "Literal"/);
    });

    it('should parse deps', function() {
      parser("defineView('name', ['foo', 'bar'], function() {});").should.eql([
        {'view': 'name', deps: ['foo', 'bar'], source: 'function() {}', loc: loc(1, 35, 1, 48)}
      ]);
    });
    it('should support no deps argument', function() {
      parser("defineView('name', function() {});").should.eql([
        {'view': 'name', deps: [], source: 'function() {}', loc: loc(1, 19, 1, 32)}
      ]);
    });
    it('should throw on non-literal deps', function() {
      (function() {
        parser("defineView('name', [foo, bar], function() {});");
      }).should.throw(/Expected dependency to be "Literal"/);
    });

    it('should parse function', function() {
      parser("defineView('name', [], function() {    foo;\nbar;  bar;\n\n});").should.eql([
        {'view': 'name', deps: [], source: 'function() {    foo;\nbar;  bar;\n\n}', loc: loc(1, 23, 4, 1)}
      ]);
    });

    it('should fail with nested views', function() {
      (function() {
        parser("defineView('name', [], function() { defineView('foo', function() {}); });");
      }).should.throw(/Unsupported nested define/);
    });

    it('should support multiple declarations', function() {
      parser(
          "\ndefineView('name', function() {});"
          + "\nfoo\ndefineView('name', function() {});foo").should.eql([
        {source: "\n", loc: loc(1, 0, 2, 0)},
        {'view': 'name', deps: [], source: 'function() {}', loc: loc(2, 19, 2, 32)},
        {source: "\nfoo\n", loc: loc(2, 34, 4, 0)},
        {'view': 'name', deps: [], source: 'function() {}', loc: loc(4, 19, 4, 32)},
        {source: "foo", loc: loc(4, 34, 4, 37)}
      ]);
    });
  });
});
