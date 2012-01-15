# Inline Styles Plugin #

## Introduction ##

The inline styles plugin allows for css associated with a module to be included as part of the javascript
associated with the module, reducing the number of requests needed to load the given module.

## Usage ##

This plugin is configured through the `styles` object on the root of the lumbar configuration file and
may be enabled by setting the `inline` key to a truthy value.

## Configuration ##

  * `inline` : Truthy enables the plugin. Falsey or undefined disables.
  * `inlineLoader` : Name of the javascript method that will load the CSS. Defaults to `${AppModule}.loader.loadInlineCSS`

## Example ##

    {
      "modules": {
        "base": {
          "scripts": [
            "base.js"
          ],
          "styles": [
            "styles/base.css"
          ]
        }
      },

      "styles": {
        "inline": true
      }
    }

## Notes ##

This plugin alters the build flow for styles mode. Some additional work may be required by styles plugins
to support this. Such plugins can determine the plugin's status through the `isInline(context)` API exposed
by the plugin. The plugin instance may be accessed by the `context.plugins.get('inline-styles')` API.

This is a two phase plugin. When overriding core plugins, but the *inline-styles* and *inline-styles-resources*
plugins must be included for this to function properly.
