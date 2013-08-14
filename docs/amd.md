# AMD Loading

## Goal

Add support a flavor of AMD. This allows the code and dependencies to be declared in one place and reduces the reliance on the `lumbar.json` file.

## Requirements

- Side-by-side usage with current declarative lumbar implementation
- Expand AMD to support lumbar module concepts
- Optimize AMD defines into lumbar modules
  - Scope must remain consistent between generated and non-generated code
  - Support source map output
- Must support existing AMD loader plugins

Nice to haves:

- If possible maintain the AMD syntax (Doubtful)
- Allow for runtime use of this feature
- Move all/most lumbar config to `require.config`

## Possible Issues

- Substantial change to build dependency graph
  - Styles become dependent on source modules
      - Will have to generate javascript files and then generate styles.
      - Will also need to perform some level of diffing on javascript changes to determine when to rebuild.
  - Source modules are now interrelated
      - Changing the module-map parameters in one module may require rebuilding others
      - defineHelpers declarations in the application module impact the remainder of the modules.
      - This is cyclical under the current proposal.
- Additional overhead
  - Now have to parse each javascript file (twice for minimized builds) rather than doing generic forwarding.
  - Change in dependency graph requires more serial behavior

We will likely have to create another phase for parsing config that must be done for all modules prior to any output. Once that has been done then all modules can proceed with their builds as normal.

For the watch case we will want to be smart about diffing the config so that we do not have a a large performance impact from cascading blanket rebuilds.

## Libraries

- Esprima - Parsing javascript source
- Escodegen - AST serializer

## Usage

WARN: This is currently TBD pending the ability to provide custom plugins for defines in addition to requires.

```javascript
defineRouter({
      // Replaces the module routes directive
      'routes': {
        'cart': 'cart',
        'cart/:shippingOptionFailed': 'cart',
        'signin': 'signin'
      }
    },
    // module!taxonomy replaces depends module directive
    ['models/cart', 'views/signin/signin', 'views/cart', 'module!taxonomy'],
    function(Cart, SigninView, CartView) {

  // Replaces preload module directive
  Phoenix.preload('checkout');

  return {
    cart: function(shippingOptionsFailed) {
      var view = new CartView({ shippingOptionsFailed: cart.saved.length && shippingOptionsFailed });
      if (shippingOptionsFailed) {
        // Remove the shipping options failed url for refresh handling
        Backbone.history.navigate('cart', {trigger: false, replace: true});
      }

      view.setModel(Cart.get());
      Phoenix.setView(view);
    },

    signin: function() {
      var view = new SigninView({
        model: Phoenix.authentication
      });
      Phoenix.setView(view);
    }
  };
});

defineView(['hbs!additional/template', 'views!threshold-shipping', 'helpers!magack', 'stylus!cart'], function() {
});

defineHelper('magack', function() {
  return function(arg, options) {
  };
});
```
