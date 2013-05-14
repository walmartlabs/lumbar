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
    GENERATED = '<generated';

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

exports.prototype.add = function(name, content, context, generated) {
  this._sourceMap = '';
  this._consumer = undefined;

  var lines = content.split('\n');
  if (name && !generated) {
    this.contentCache[name] = {
      lines: lines,
      context: context
    };
  }

  if (this.generator) {
    _.each(lines, function(line, index) {
      this.generator.addMapping({
        source: generated && name ? (GENERATED + ':' + name + '>') : (name || GENERATED + '>'),
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

exports.prototype.sourceMapToken = function() {
  return '//@ sourceMappingURL=' + basename(this.output) + '.map\n';
};

exports.prototype.writeSourceMap = function(options) {
  var tasks = [],
      outputDir = dirname(this.output) + '/',
      self = this;

  tasks.push(function(callback) {
    fu.writeFile((options.mapDestination || self.output) + '.map', self.sourceMap(), callback);
  });
  if (options.outputSource) {
    _.each(this.contentCache, function(content, name) {
      tasks.push(function(callback) {
        var file = outputDir + name;
        fu.ensureDirs(dirname(file), function(err) {
          if (err) {
            return callback(err);
          }
          fu.writeFile(file, content.lines.join('\n'), callback);
        });
      });
    });
  }

  async.parallel(tasks, function(err) {
    if (err) {
      throw err;
    }

    self.add(undefined, self.sourceMapToken());
    options.callback();
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

  this._consumer = this._consumer || new SourceMapConsumer(this.sourceMap());
  var original = this._consumer.originalPositionFor({line: line, column: column}),
      lines;

  var content = this.contentCache[original.source];
  if (content) {
    var lines = content.lines,
        line = original.line - 1,
        start = Math.max(line - WARNING_CONTEXT + 1, 0),
        end = Math.min(line + WARNING_CONTEXT, lines.length),
        gutterWidth = (end + '').length;
    line = line + 1;

    lines = lines.slice(start, end).map(function(value, index) {
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
  } else {
    return;
  }

  return {
    file: original.source,
    fileContext: content.context,
    line: original.line,
    column: original.column,
    context: lines
  };
};
