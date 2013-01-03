# 2.0.0 Beta 10 - Jan 2nd 2013

Changes:

- Fix handling of styleRoot in mixins.

# 2.0.0 Beta 10 - Dec 26th 2012

Changes:

- Added support for source maps

- Update mixin handling for namespaces

  This allows different mixins to define mixins with the same name. Consumers can differentiate
  between the mixins via the `container` attribute on the mixin reference. i.e.

  ```
  "mixins": [
    {"name": "test", "container": "phoenix-build"}
  ]
  ```

  All mixin projects must now define a name field so they may be referenced in this manner.

- Fix incorrect configuration load when using watch mode.
- Fix watch cleanup on file removal.

# 2.0.0 Beta 9 - Dec 21st 2012

Changes:

- Filter duplicate files in the same module

  This behavior may be disabled on the resource level via the `"duplicate": true`
  attribute or at the application level with the `"filterDuplicates": false` top level
  attribute.

- Files added through pattern mapping and auto-includes no longer require a config
  change to watch for changes.

- Allow for disabling of all alliases with `"aliases": false`

- Fix CoffeeScript plugin (@jasonwebster)

# 2.0.0 Beta 8 - Dec 16th 2012

Changes:

- Implement source warning framework

- Update to Uglify 2.2

  NPM will refuse to install this under 0.8 and lower due to an upstream dependency so this is
  now optional.

- Fix filtering of generated resources

# 2.0.0 Beta 7 - Dec 11th 2012

Changes:

- Add support for mixin file references via. mixin resource attribute.

    {"src": "lumbar-loader-backbone.js", "mixin": "lumbar-loader"},

  Mixins must define a name value in the mixin config file to utilize this feature.

- Fix template auto-include in mixin contexts

- Fix execution error in coffeescript plugin (needs unit tests)

# 2.0.0 Beta 6 - Dec 4th 2012

Changes:

- Add `template.root` property for template prefix stripping.

- Removed precompiled template template.

  Moving forward template templates should use `{{handlebarsCall}}` to differentiate between
  precompiled and client compiled mode.

# 2.0.0 Beta 5 - Nov 25th 2012

Changes:

- Watch support for mixin config. Changes to mixin config files will now rebuild the project
  when in watch mode.

- Allow file config independent rebuilds

  Adds isPrimary flag to the file config. When true this will rebuild all
  configs for a given mode. When false will ignore changes to the inputs
  when undefined will continue the default behavior of separate rebuilds.

- Optimize stylus builds when using multiple pixel densities.

  This saves about 50% of the developer build time for mobile.walmart.com.

- stylus-config plugin for sharing variables between stylus and javascript

- Allow lumbar plugins to interact with the stylus compiler at runtime

  Allows plugins to register callbacks on the stylus generator using the `plugins` field. This
  mechanism allows additional plugins and source modifications on stylus compilation steps. The
  stylus-config plugin provides an example of this API's usage.

- Optimize plugin execution loop

  The plugin executor now enforces async execution of async callbacks. This may break plugins that
  incorrectly took advantage of non-contract synchronous behavior in the app.

- Switch to cheerio for update-externals parsing

- Improve various error messages

- Watch package config files for changes

- CLI: Allow multiple --module parameters


# 2.0.0 Beta 4 - Nov 5th 2012

Changes:

- Allow specific modules to disable particular aliases.


# 2.0.0 Beta 3 - Oct 25th 2012

Changes:

- Improves EMFILE error handling.

- Watch unit test library updates


# 2.0.0 Beta 2 - Oct 23rd 2012

Changes:

- Separated handlebars processing from template includes

  Handlebar templates may now be included in script array or the template lookup field. Templates
  in the lookup field are no longer required to be handlebars templates.

- Template plugin now supports pattern matching includes.

  Example mapping for thorax template structure:
  ```javascript
    "templates": {
      "auto-include": {
        "js/views/(.*)\\.(?:js|coffee)": [
          "templates/$1.handlebars",
          "templates/$1-item.handlebars",
          "templates/$1-empty.handlebars"
        ]
      }
    }
  ```

- Local module reference support

  Module variables are now aliased internally meaning that a module with a top level name
  `Application` can access it's exported members by accessing the `Application` object at any point
  in time. Previously initialization logic was only able to access this through the `exports` or
  `module.exports` references.

  Note that for top level objects this is an alias so assigning to this variable will not update the
  external reference. The default template is configured to warn in the event that it detects this
  situation.

- Scope aliases

  It's now possible to define aliases globally via the scope.alias config object and locally by
  defining the alias object on specific modules. These alias will create local variable references
  to any javascript statement, allowing for minimization of frequently used references.

  Example global aliases:
  ```javascript
    "scope": {
      "aliases": {
        "View": "Application.View",
        "Application": "Application"
      }
    }
  ```

- Allow filtering of resources via not structures, i.e. `"platform": {"not": "web"}` and
  `"packages": {"not": ["foo", "bar"]}`.

- Allow filtering of resources based on combined module or not via the `combined` attribute.
  Undefined for all modes, true for combined mode only, false for non-combined only.

- Significant rework of tests to focus more on unit testing with better edge case coverage

- Fixed mixin modules implementation. Properly links to mixin files. Mixin modules may now be
  applied as mixins to other modules, have their own mixins, and be suppressed via false module
  value.

# 2.0.0 Beta 1 - Oct 9th 2012

Changes:

- Mixin support

- Stylus useNib flag

  UPDATE: As of beta 2 this is no longer a breaking change. Includes referencing nib directly will
  have this flag applied.

  Updates nib include in stylus to utilize a named attribute. This was necessary to support mixins
  of the nib plugin. Update path for nib users is to remove the `nib` entry from the styles includes
  list and to add a `useNib` attribute to the styles object set to true.

  Old:
  ```javascript
    "styles": { "includes": ["nib"] }
  ```

  New:
  ```javascript
    "styles: { "useNib": true }
  ```

- Scope
  - Possible to define both a scope and template value.

- API Changes
  - config.readConfig utility method

    Helper method that strips out comments and other comments that causes the JSON parse to blow up.
    It's recommended that all interaction with lumbar config files use this helper method.

  - config.create factor method

    Method used for creating a config object from a javascript key-value object rather than directly
    from a file.

  - Moved config.fileList and config.filterResource to static lumbar.build object

  - Created new loadMixin and loadConfig plugin points. Plugins that need to perform mixin-specific
    behavior should implement these methods.
