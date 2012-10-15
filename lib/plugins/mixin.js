var _ = require('underscore');

module.exports = {
  priority: 1,

  loadConfig: function(context, next, complete) {
    var allModules = context.config.attributes.modules,
        modules = _.filter(allModules, function(module) { return module.mixins; });

    _.each(modules, function(module) {
      // Extend the module with each of the mixins content, giving priority to the module
      _.each(module.mixins.reverse(), function(mixin) {
        var mixinConfig = mixin.name && mixin,
            name = mixin.name || mixin;
        mixin = _.extend(
            {},
            context.mixins.get(name),
            mixinConfig);
        if (!mixin.attributes) {
          return complete(new Error('Mixin "' + name + '" is not defined.'));
        }

        // Save a distinct instance of the config for resource extension
        if (mixinConfig) {
          mixinConfig = _.clone(mixinConfig);
          delete mixinConfig.overrides;
          delete mixinConfig.name;
        }

        // Direct copy for any fields that are not already defined on the object.
        _.defaults(module, mixin.attributes);

        // Merge known array/object types
        ['scripts', 'styles', 'static', 'routes'].forEach(function(field) {
          var value = module[field],
              mixinValue = mixin.attributes[field];

          if (!value) {
            return;
          }

          if (value === mixinValue) {
            // Clone any direct copy entries from a mixin
            if (_.isArray(value)) {
              module[field] = context.mixins.mapFiles(value, mixin);
            } else {
              module[field] = _.clone(value);
            }
          } else if (!_.isArray(value)) {
            _.defaults(value, mixinValue);
          } else if (mixinValue) {
            mixinValue = context.mixins.mapFiles(mixinValue, mixin, mixinConfig);

            var mixinFirstLocal = firstLocal(mixinValue),
                moduleFirstLocal = firstLocal(value);

            if (mixinFirstLocal) {
              value.unshift.apply(value, mixinValue.slice(0, mixinFirstLocal));
            }
            if (mixinFirstLocal < mixinValue.length) {
              var locals = mixinValue.slice(mixinFirstLocal);
              locals.unshift(mixinFirstLocal+moduleFirstLocal, 0);
              value.splice.apply(value, locals);
            }
          }
        });
      });
    });

    _.each(context.mixins.configs, function(mixin) {
      // Import any modules that are not overriden in the core file
      _.each(mixin.modules, function(module, key) {
        if (!_.has(allModules, key)) {
          allModules[key] = module;
        }
      });
    });

    next(complete);
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

