var inlineStyles = require('./inline-styles')

module.exports = {
  moduleResources: function(context, next) {
    if (inlineStyles.isInline(context) && context.mode === 'styles') {
      // Prevent stylesheet output if in inline mode
      return [];
    } else if (inlineStyles.isInline(context)) {
      var module = context.module,
          scripts = next();
      return next().concat(module.styles || []);
    } else {
      return next();
    }
  }
};
