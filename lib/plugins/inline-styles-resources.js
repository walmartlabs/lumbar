var inlineStyles = require('./inline-styles')

module.exports = {
  mode: ['scripts', 'styles'],
  priority: 80,

  moduleResources: function(context, next, complete) {
    if (inlineStyles.isInline(context) && context.mode === 'styles') {
      // Prevent stylesheet output if in inline mode
      complete(undefined, []);
    } else if (inlineStyles.isInline(context)) {
      next(function(err, scripts) {
        complete(undefined, scripts.concat(context.module.styles || []));
      });
    } else {
      next(complete);
    }
  }
};
