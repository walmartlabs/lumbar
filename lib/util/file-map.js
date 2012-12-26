var _ = require('underscore'),
    async = require('async'),
    fu = require('../fileUtil'),
    path = require('path'),
      dirname = path.dirname,
      basename = path.basename,
    sourceMap,
      SourceMapConsumer,
      SourceMapGenerator;

try {
  sourceMap = require('source-map');
  SourceMapConsumer = sourceMap.SourceMapConsumer;
  SourceMapGenerator = sourceMap.SourceMapGenerator;
} catch (err) {
  /* NOP */
}

const WARNING_CONTEXT = 3,
    GENERATED = '<generated>';

module.exports = exports = function(output) {
  this.output = output;
  if (SourceMapGenerator) {
    this.generator = new SourceMapGenerator({file: output});
  }

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

  if (this.generator) {
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
  }

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

exports.prototype.writeSourceMap = function(callback) {
  var tasks = [],
      outputDir = dirname(this.output) + '/',
      self = this;

  tasks.push(function(callback) {
    fu.writeFile(self.output + '.map', JSON.stringify(self.sourceMap()), callback);
  });
  _.each(this.contentCache, function(content, name) {
    tasks.push(function(callback) {
      var file = outputDir + name;
      fu.ensureDirs(dirname(file), function(err) {
        if (err) {
          return callback(err);
        }
        fu.writeFile(file, content.join('\n'), callback);
      });
    });
  });

  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }

    self.add(undefined, '//@ sourceMappingURL=' + basename(self.output) + '.map\n');
    callback();
  });
};

exports.prototype.context = function(line, column) {
  if (!SourceMapConsumer) {
    return {
      file: this.output,
      line: line,
      column: column
    };
  }

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
