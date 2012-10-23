var _ = require('underscore');

module.exports = {
  priority: 1,

  loadConfig: function(context, next, complete) {
    var modules = context.config.attributes.modules,
        errored;
    _.each(context.mixins.configs, function(mixin) {
      // Import any modules that are not overriden in the core file
      _.each(mixin.modules, function(module, key) {
        if (!_.has(modules, key)) {
          module = modules[key] = _.clone(module);
          module._mixin = mixin;

          ['scripts', 'styles', 'static', 'routes'].forEach(function(field) {
            var value = module[field];

            // Deep(er) clone, updating file references
            if (_.isArray(value)) {
              module[field] = context.mixins.mapFiles(value, mixin);
            } else if (value) {
              module[field] = _.clone(value);
            }
          });
        }
      });
    });

    _.each(modules, function(module, name) {
      try {
        var mixins = context.mixins.moduleMixins(module);
      } catch (err) {
        errored = true;
        return complete(new Error('Failed mixins for module "' + name + '": ' + err.message));
      }

      _.each(mixins, function(mixin) {
        var mixinConfig = mixin.mixinConfig;
        mixin = mixin.mixin;

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

