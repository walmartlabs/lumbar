var _ = require('underscore'),
    sourceMap = require('source-map'),
      SourceMapConsumer = sourceMap.SourceMapConsumer,
      SourceMapGenerator = sourceMap.SourceMapGenerator;

const WARNING_CONTEXT = 3,
    GENERATED = '<generated>';

module.exports = exports = function(output) {
  this.generator = new SourceMapGenerator({file: output});
  this.contentCache = {};
  this.line = 1;
  this.column = 1;
  this._content = '';
};

exports.prototype.add = function(name, content) {
  this._sourceMap = '';

  var lines = content.split('\n');
  if (name) {
    this.contentCache[name] = lines;
  }

  _.each(lines, function(line, index) {
    this.generator.addMapping({
      source: name || GENERATED,
      generated: {
        line: this.line + index,
        column: index ? 1 : this.column
      },
      original: {
        line: index + 1,
        column: 1
      }
    });
  }, this);

  this.line += lines.length - 1;
  if (lines.length >= 2) {
    this.column = 1;
  }
  this.column += lines[lines.length - 1].length;

  this._content += content;
};
exports.prototype.content = function() {
  return this._content;
};
exports.prototype.sourceMap = function() {
  this._sourceMap = this._sourceMap || this.generator.toString();
  return this._sourceMap;
};

exports.prototype.context = function(line, column) {
  var consumer = new SourceMapConsumer(this.sourceMap()),
      original = consumer.originalPositionFor({line: line, column: column}),
      lines;

  var content = this.contentCache[original.source];
  if (content) {
    var line = original.line - 1,
        start = Math.max(line - WARNING_CONTEXT + 1, 0),
        end = Math.min(line + WARNING_CONTEXT, content.length),
        gutterWidth = (end + '').length;
    line = line + 1;

    lines = content.slice(start, end).map(function(value, index) {
      var lineNum = start + index + 1,
          lineText = lineNum + '',
          buffer = '';
      for (var i = lineText.length; i < gutterWidth; i++) {
        buffer += ' ';
      }
      buffer += lineText;
      buffer += (lineNum === line) ? ':  ' : '   ';
      buffer += value;
      return buffer;
    });
    lines = lines.join('\n');
  } else {
    return {
      file: original.source,
      line: line,
      column: column
    };
  }

  return {
    file: original.source,
    line: original.line,
    column: original.column,
    context: lines
  };
};
