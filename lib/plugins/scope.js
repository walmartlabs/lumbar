function generator(string) {
  var ret = function(callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.sourceFile = undefined;
  return ret;
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
      cache.scopeName = appName + '.' + context.module.name;
    }
  }

  // Wrap the module content in a javascript module
  resources.unshift(generator(cache.scopeName + ' = (function() {\nvar module = {exports: {}};\nvar exports = module.exports;\n'));
  resources.push(generator('return module.exports;\n}).call(this);\n'));
  return resources;
}

module.exports = {
  mode: 'scripts',

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
