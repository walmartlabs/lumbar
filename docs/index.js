var _ = require('underscore'),
    fs = require('fs'),
    path = require('path');

module.exports = function(static) {
  var outputPluginIndex = _.debounce(function() {
    pluginIndex.update();
  }, 1000);

  var plugins = {},
      pluginIndex = static.createFile('plugins/index.html');

  //process markdown files with handlebars then markdown
  static.file(/plugins\/.+\.md$/, function(file) {
    file.transform(function(buffer, next) {
      var content = buffer.toString(),
          title = /^#\s*(.*?)\s*#*$/m.exec(content);
      plugins[file.target] = {
        title: title && title[1],
        summary: ''
      };
      next(buffer);
    });
  });
  static.file(/\.(md|markdown)$/, function(file) {
    file.transform('markdown');
    file.changeExtensionTo('html');
  });

  //process handlebars files with handlebars
  static.file(/\.handlebars$/, function(file) {
    file.transform('handlebars');
    file.changeExtensionTo('html');
  });

  //process stylus files with stylus
  static.file(/\.styl$/, function(file) {
    file.transform('stylus');
    file.changeExtensionTo('css');
  });

  //copy assets to assets folder in target
  static.file(/^assets\//, function(file) {
    file.write('assets');
  });

  //copy scripts to scripts folder in target
  static.file(/^scripts\//, function(file) {
    file.write('scripts');
  });

  //copy styles to styles folder in target
  static.file(/^styles\//, function(file) {
    file.write('styles');
  });

  //copy pages to root
  static.file(/\.(?:html?|md)$/, function(file) {
    //add package.json values to scope of file
    for (var key in static.package) {
      file.set(key, static.package[key]);
    }

    //save to root of target directory
    file.write('.', '');

    //wrap pages in template
    file.transform(function(buffer, next) {
      next(file.render('templates/index.handlebars', {
        yield: buffer
      }));
    });
  });

  static.file(/(plugins\/)?.+\.md$/, function(file) {
    file.$(function(window) {
      //set the title of the page to be the first h1 in the body if present
      var title, title_element = window.$('.container h1:first')[0];
      if (title_element) {
        title = title_element.innerHTML;
        window.$('title').html(title)
      }

      // Update all markdown links to point to the html equivalent
      // NOTE: forEach is not supported by the return from $ in this context
      var anchors = window.$('a[href$=".md"]');
      for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        anchor.href = anchor.getAttribute('href').replace(/\.md$/, '.html');
      }
    });
  });

  static.file(/[^\/]+\.md$/, function(file) {
    file.$(function(window) {
      //assign ids
      window.$('h2, h3, h4').each(function() {
        this.id = this.innerHTML.split(/\s/).shift().replace(/\./g,'-').toLowerCase();
      });

      //build toc
      var toc_html = '<ul>';
      window.$('h2').each(function() {
        toc_html += '<li class="header"><a href="#' + this.id + '">' + this.innerHTML + '</a>';
        var signatures = window.$(this).nextUntil('h2').filter('h3');
        if (signatures.length) {
          toc_html += '<ul class="sub">';
          signatures.each(function(){
            toc_html += '<li><a href="#' + this.id + '">' + this.innerHTML.split(/\</).shift() + '</a></li>'
          });
          toc_html += '</ul></li>';
        }
      });
      toc_html += '</ul>';

      //append toc
      window.$('#sidebar').html(toc_html);
    });
  });

  static.file(/plugins\/.+$/, function(file) {
    file.$(function(window) {
      var toc_html = '<ul>'
        + '<li class="header"><a href="index.html">Plugins</a>'
        + '<ul class="sub">';
      _.chain(plugins).keys().sort().each(function(name) {
        toc_html += '<li><a href="' + file.get('root') + name + '">' + plugins[name].title + '</a></li>';
      });
      toc_html += '</ul></li>'
        + '<li class="header"><a href="' + file.get('root') + '">Home</a></li>'
        + '</ul>';
      window.$('#sidebar').html(toc_html);

      // Collect the intro info (ignoring the index file)
      var plugin = plugins[file.target];
      if (plugin) {
        plugin.summary = '';
        window.$('#introduction').nextUntil('h2').each(function() {
          plugin.summary += this.outerHTML;
        });
      }
    });
  });

  static.file(/plugins\/index\.html$/, function(file) {
    file.$(function(window) {
      var pluginList = '';
      for (var name in plugins) {
        pluginList += '<h2><a href="' + file.get('root') + name + '">' + plugins[name].title + '</a></h2>' + plugins[name].summary;
      }

      window.$('.container').html(pluginList);
    });
  });

  static.file(/plugins\/.+\.md$/, function(file) {
    file.on('write', function(file, next) {
      outputPluginIndex()
      next();
    });
  });
};
