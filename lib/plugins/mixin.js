var _ = require('underscore');

module.exports = {
  priority: 1,

  resolvePath: resolvePath,

  loadConfig: function(context, next, complete) {
    var modules = context.config.attributes.modules;
    modules = _.filter(modules, function(module) { return module.mixins; });

    _.each(modules, function(module) {
      // Extend the module with each of the mixins content, giving priority to the module
      _.each(module.mixins.reverse(), function(mixin) {
        var mixinConfig = mixin.name && mixin;
        mixin = _.extend(
            {},
            context.mixins[mixin.name || mixin],
            mixinConfig);

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
              module[field] = mapFiles(value, mixin);
            } else {
              module[field] = _.clone(value);
            }
          } else if (!_.isArray(value)) {
            _.defaults(value, mixinValue);
          } else if (mixinValue) {
            mixinValue = mapFiles(mixinValue, mixin);

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
    next(complete);
  }
};

function resolvePath(name, mixin) {
  if (!mixin) {
    return name;
  }

  var override = mixin.overrides && mixin.overrides[name];
  if (override) {
    return _.isString(override) ? override : name;
  }

  return mixin.root + name;
}

function mapFiles(value, mixin) {
  return _.map(value, function(resource) {
    if (resource.src) {
      resource = _.clone(resource);
    } else {
      resource = {src: resource};
    }

    var src = resource.src;
    resource.src = mixin.root + resource.src;

    var override = mixin.overrides && mixin.overrides[src];
    if (override) {
      resource.originalSrc = resource.src;
      resource.src = _.isString(override) ? override : src;
    }

    resource.mixin = mixin;
    return resource;
  });
}
function firstLocal(collection) {
  for (var i = 0, len = collection.length; i < len; i++) {
    if (!collection[i].global) {
      return i;
    }
  }
  return i;
}

