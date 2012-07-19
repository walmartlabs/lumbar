var handlebars = require('handlebars'),
    fu = require('../fileUtil');

function generator(string) {
  var ret = function(context, callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.sourceFile = undefined;
  return ret;
}

const DEFAULT_MODULE_START_TEMPLATE = '{{{scope}}} = (function() {\nvar module = {exports: {}};\nvar exports = module.exports;\n';
const DEFAULT_MODULE_END_TEMPLATE = 'return module.exports;\n}).call(this);\n';

var scopeTemplateDelimiter = /\{?\{\{yield\}\}\}?/;

function ensureModuleTemplates(context, complete) {
  function setTemplates(start, end) {
    context.configCache.moduleStartTemplate = start;
    context.configCache.moduleEndTemplate = end;
  }

  if (!context.configCache.moduleStartTemplate) {
    var template = context.config.attributes.scope && context.config.attributes.scope.template;
    if (template) {
      context.fileUtil.loadTemplate(template, scopeTemplateDelimiter, function(err, templates) {
        if (err) {
          complete(err);
        } else {
          setTemplates(templates[0], templates[1]);
          complete();
        }
      });
    } else {
      setTemplates(handlebars.compile(DEFAULT_MODULE_START_TEMPLATE), handlebars.compile(DEFAULT_MODULE_END_TEMPLATE));
      complete();
    }
  } else {
    complete();
  }
}

function wrapResources(resources, context) {
  var cache = context.moduleCache;
  if (!cache.scopeName) {
    var app = context.config.attributes.application,
        appName = app && app.name;

    if (!appName || context.module.topLevelName || context.config.isAppModule(context.module)) {
      cache.isTopNamespace = true;
      cache.scopeName = context.module.topLevelName || appName || context.module.name;
    } else {
      cache.scopeName = appName + "['" + context.module.name + "']";
    }
    cache.appName = appName;
  }

  // Wrap the module content in a javascript module
  if (resources.length) {
    resources.unshift(generator(context.configCache.moduleStartTemplate({
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scope: cache.scopeName
    })));
    resources.push(generator(context.configCache.moduleEndTemplate({
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scope: cache.scopeName
    })));
  }
  return resources;
}

module.exports = {
  mode: 'scripts',
  priority: 50,

  resourceList: function(context, next, complete) {
    next(function(err, resources) {
      if (err) {
        return complete(err);
      }

      if (context.config.attributes.scope === 'resource'
          && !context.resource.global
          && !context.resource.dir) {
        resources.unshift(generator('(function() {\n'));
        resources.push(generator('}).call(this);\n'));
      }
      complete(undefined, resources);
    });
  },

  module: function(context, next, complete) {
    next(function(err) {
      var resources = context.moduleResources;
      if (resources.length && context.config.attributes.scope !== 'none') {
        ensureModuleTemplates(context, function(err) {
          if (err) {
            complete(err);
          } else {
            // Split up globals and non-globals
            var globals = [],
                children = [];
            for (var i = 0; i < resources.length; i++) {
              if (!resources[i].global) {
                children.push(resources[i]);
              } else {
                if (children.length) {
                  throw new Error('Scoped files may not appear before global files.');
                }
                globals.push(resources[i]);
              }
            }
    
            globals.push.apply(globals, wrapResources(children, context, complete));
    
            // Insert the package declaration
            if (context.moduleCache.isTopNamespace) {
              globals.unshift(generator('var ' + context.moduleCache.scopeName + ';\n'));
            }
    
            context.moduleResources = globals;
            complete();
          }
        });
      } else {
        complete();
      }
    });
  }
};
