var path = require('path'),
    fs = require('fs'),
    fu = require('./../fileUtil'),
    cwd = process.cwd(),
    thoraxConfig = JSON.parse(fu.readFileSync(path.join(cwd, 'thorax.json')));

module.exports = {
  priority: 2,
  mode: ['scripts', 'styles'],
  moduleResources: function(context, next, complete) {
    next(function(err, ret) {
      if (err) {
        return complete(err);
      }
      if (context.mode === 'styles') {
        addToPayload(ret, path.join(thoraxConfig.paths.styles, context.module.name + '.styl'));
      } else if (context.mode === 'scripts') {
        var moduleViews = path.join(thoraxConfig.paths.views, context.module.name);
        [
          path.join(thoraxConfig.paths.models, context.module.name),
          path.join(thoraxConfig.paths.collections, context.module.name),
          moduleViews,
          path.join(thoraxConfig.paths.routers, context.module.name + '.js')
        ].forEach(function(filePath) {
          addToPayload(ret, filePath)
        });
        //add templates
        readdirSync(path.join(cwd, moduleViews), function(err, results) {
          results && results.forEach(function(result) {
            var viewName = result.substring(cwd.length + 1, result.length),
                templateName = path.join(thoraxConfig.paths.templates, viewName.substring(thoraxConfig.paths.views.length + 1, viewName.length)).replace(/\.\w+$/, '');
            [
              templateName + '.handlebars',
              templateName + '-item.handlebars',
              templateName + '-empty.handlebars'
            ].forEach(function(templatePath) {
              if (path.existsSync(path.join(cwd, templatePath)) && !detectTemplate(ret, templatePath)) {
                ret.push({template: templatePath});
                console.log('added',templatePath,'to',viewName);
              }
            });
          });
        });
      }
      complete(undefined, ret);
    });
  }
};

function addTemplatesForScript(ret, script) {

}

function detectTemplate(ret, template) {
  for (var i = 0; i < ret.length; ++i) {
    var item = ret[i];
    if (item && item.template && item.template === template) {
      return true;
    }
  }
  return false;
}

function addToPayload(ret, filePath) {
  if (ret && ret.indexOf(filePath) === -1 && path.existsSync(path.join(cwd, filePath))) {
    console.log('added', filePath);
    ret.push(filePath);
  }
}

function readdirSync(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          readdirSync(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

