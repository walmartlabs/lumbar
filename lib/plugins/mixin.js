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
      });
    }
    next(complete);
  }
};
