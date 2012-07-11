var handlebars = require('handlebars');

function generator(string) {
  var ret = function(context, callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.sourceFile = undefined;
  return ret;
}

const DEFAULT_MODULE_START_TEMPLATE = '{{{scope}}} = (function() {\nvar module = {exports: {}};\nvar exports = module.exports;\n';
const DEFAULT_MODULE_END_TEMPLATE = 'return module.exports;\n}).call(this);\n';
var moduleStartTemplate,
    moduleEndTemplate;

function ensureModuleTemplates(context) {
  if (!moduleStartTemplate) {
    moduleStartTemplate = handlebars.compile(context.config.attributes.moduleStartTemplate || DEFAULT_MODULE_START_TEMPLATE);
  }
  if (!moduleEndTemplate) {
    moduleEndTemplate = handlebars.compile(context.config.attributes.moduleEndTemplate || DEFAULT_MODULE_END_TEMPLATE);
  }
}

function wrapResources(resources, context) {
  ensureModuleTemplates(context);
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
    resources.unshift(generator(moduleStartTemplate({
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scope: cache.scopeName
    })));
    resources.push(generator(moduleEndTemplate({
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

        globals.push.apply(globals, wrapResources(children, context));

        // Insert the package declaration
        if (context.moduleCache.isTopNamespace) {
          globals.unshift(generator('var ' + context.moduleCache.scopeName + ';\n'));
        }

        context.moduleResources = globals;
      }

      complete();
    });
  }
};
