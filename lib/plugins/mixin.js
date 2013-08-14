var _ = require('underscore');

module.exports = {
  priority: 1,

  loadConfig: function(context, next, complete) {
    var modules = context.config.attributes.modules,
        errored;
    _.each(context.libraries.configs, function(library) {
      // Import any modules that are not overriden in the core file
      _.each(library.modules, function(module, key) {
        if (!_.has(modules, key)) {
          module = modules[key] = _.clone(module);

          ['scripts', 'styles', 'static', 'routes'].forEach(function(field) {
            var value = module[field];

            // Deep(er) clone, updating file references
            if (_.isArray(value)) {
              module[field] = context.libraries.mapFiles(value, library);
            } else if (value) {
              module[field] = _.clone(value);
            }
          });
        }
      });
    });

    _.each(modules, function(module, name) {
      module.name = module.name || name;
      var mixins;
      try {
        mixins = context.libraries.moduleMixins(module);
      } catch (err) {
        errored = true;
        return complete(new Error('Failed mixins for module "' + name + '": ' + err.message));
      }

      // Map existing files that have mixin references
      try {
        ['scripts', 'styles', 'static'].forEach(function(field) {
          var list = module[field];

          if (list) {
            module[field] = context.libraries.mapFiles(list);
          }
        });

        _.each(mixins, function(mixin) {
          var mixinConfig = mixin.mixinConfig,
              library = mixin.library;

          // Direct copy for any fields that are not already defined on the object.
          _.defaults(module, library.attributes);

          // Merge known array/object types
          ['scripts', 'styles', 'static', 'routes'].forEach(function(field) {
            mergeValues(module, field, library, mixinConfig, context);
          });
        });
      } catch (err) {
        errored = true;
        return complete(err);
      }
    });

    // Remove suppressed modules completely
    _.each(_.keys(modules), function(name) {
      if (!modules[name]) {
        delete modules[name];
      }
    });

    if (!errored) {
      next(complete);
    }
  }
};

function firstLocal(collection) {
  for (var i = 0, len = collection.length; i < len; i++) {
    if (!collection[i].global) {
      return i;
    }
  }
  return i;
}

function mergeValues(module, field, library, mixinConfig, context) {
  var value = module[field],
      mixinValue = library.attributes[field];

  if (!value) {
    return;
  }

  if (value === mixinValue) {
    // Clone any direct copy entries from a mixin
    if (_.isArray(value)) {
      module[field] = context.libraries.mapFiles(value, library, mixinConfig);
    } else {
      module[field] = _.clone(value);
    }
  } else if (!_.isArray(value)) {
    _.defaults(value, mixinValue);
  } else if (mixinValue) {
    mixinValue = context.libraries.mapFiles(mixinValue, library, mixinConfig);

    var mixinFirstLocal = firstLocal(mixinValue),
        moduleFirstLocal = firstLocal(value);

    if (mixinFirstLocal) {
      value.unshift.apply(value, mixinValue.slice(0, mixinFirstLocal));
    }
    if (mixinFirstLocal < mixinValue.length) {
      var locals = mixinValue.slice(mixinFirstLocal);
      locals.unshift(mixinFirstLocal + moduleFirstLocal, 0);
      value.splice.apply(value, locals);
    }
  }
}
