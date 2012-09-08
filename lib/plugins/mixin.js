var _ = require('underscore');

module.exports = {
  priority: 1,

  moduleResources: function(context, next, complete) {
    var module = context.module;
    if (module.mixins) {
      // Extend the module with each of the mixins content, giving priority to the module
      _.each(module.mixins.reverse(), function(mixin) {
        mixin = context.mixins[mixin];

        // Direct copy for any fields that are not already defined on the object.
        _.defaults(module, mixin.attributes);

        // Merge known array/object types
        ['scripts', 'styles', 'static', 'routes'].forEach(function(field) {
          var value = module[field],
              mixinValue = mixin.attributes[field];

          if (value === mixinValue) {
            // Clone any direct copy entries from a mixin
            module[field] = _.clone(value);
          } else if (!_.isArray(value)) {
            _.defaults(value, mixinValue);
          } else if (mixinValue) {
            function firstLocal(collection) {
              for (var i = 0, len = collection.length; i < len; i++) {
                if (!collection[i].global) {
                  return i;
                }
              }
              return i;
            }

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
    }
    next(complete);
  }
};
