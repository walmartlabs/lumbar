# Release Notes

## 2.3.1 - Aug 8th 2013

- Fixed stylus includes when overriding files in nested mixins

## 2.3.0 - Aug 7th 2013

- Update stylus to 0.36.1
- Fixed root handling when overriding files in nested mixins
- Fixed naming of overriden handlebars templates
- Removed `Library.resolvePath`.

  `Library.mapFile` should be used instead

## 2.2.7 - Aug 5th 2013

- Fix mixin attribute propagation

## 2.2.6 - July 26th 2013

- Ensure that all mixins are iterated over when adding to module
- Update uglify to 2.3

## 2.2.5 - July 15th 2013

- `config` method has been removed

  This has been replaced with the `config(config)` event which is emitted on the lumbar event instance after any changes to the config.

- Fixed error seen when mixins with child mixins where incorrectly included multiple times.

- Refactor state machine and utils

## 2.2.4 - June 14th 2013

- Fix error with ./ mixin in stylus

## 2.2.3 - June 14th 2013

- Remove duplicate library declarations

## 2.2.2 - June 13th 2013

- Allow library loading on CLI via `--library=name`
- Allow CLI output named build or watch without requiring path components
- Allow library specification in template lookup

Compatibility Notes:

- If multiple watch or build commands are specified on the CLI the action will no longer be the last action specified. This could lead to unexpected behavior for improperly formed CLI commands.

## 2.2.1 - June 11th 2013

- Hack around bower config issue when passing config files on CLI

## 2.2.0 - June 11th 2013

- Add bower namespace support through the `bower` resource attribute.

  Resources can no reference specific bower packages by name without needing to know where the bower path is.

- Automatically load lumbar libraries that are in the bower components directory.

- Use global config for template auto include

- Update to Handlebars 1.0.12 / 1.0.0

- Update minimum node version to 0.8

## 2.1.1 - June 4th 2013

- Update stylus-images dependency

## 2.1.0 - May 14th 2013

- Lock down code generating library versions

- #77 - Fix watch tracking if initial build fails

- Allow server mode handlebars options

- #88 - Implement global workers limit

- Allow mixins to specify handlebars known helpers.

  This moves the known helpers declaration from `templates.precompile.knownHelpers` to `template.knownHelpers`. The older path is still available but does not support mixins.

## 2.0.0 - May 8th 2013

- Fix template linking for library modules
- Output templates prior to their referencing file
- Use `library` rather than `container` for fully qualified mixin lookup
- Allow plugins in Grunt task (@stehag)
- Add verbose logging options
- Rename root mixins to libraries.

    Library import declarations have been changed from `mixins` to `libraries` and are otherwise identical. Likewise, resource library references have been changed from `mixin` to `library`.

## 2.0.0 Beta 21 - Apr 3rd 2013

- Allow uglify config via `uglify` project config option.

## 2.0.0 Beta 20 - Mar 22nd 2013

- Implement server-scripts plugin

## 2.0.0 Beta 19 - Mar 12th 2013

- Fix stylus execution outside of the lumbar directory
- Add overrides false flag to prevent output of particular resources from mixins

## 2.0.0 Beta 17 - Feb 21st 2013

- Added `lumbar` grunt task

## 2.0.0 Beta 15 - Feb 5th 2013

Changes:

- Break stylus execution into worker processes

    This change dropped build times across the board, with a large build that was taking 20 seconds
    dropping to 7 seconds. This breaks existing stylus plugins who must now be defined in worker
    files which may then be required into the worker process. Ex:

```
            resource.plugins.push({
              plugin: __dirname + '/stylus-config-worker',
              data: config
            });
```

- Support source map output to alternate locations

## 2.0.0 Beta 14 - Jan 9th 2013

Changes:

- Fix bug while watching template files.

## 2.0.0 Beta 13 - Jan 8th 2013

Changes:

- Cleanup override handling in stylus templates
- Allow template hash references to pull from specific mixins
- Fix stylus mixin compilation under combined compile
- Allow for nested mixin definition

## 2.0.0 Beta 12 - Jan 7th 2013

Changes:

- Add `depends` field to module map for lumbar loader module dependencies
- Fix source map comment output
- Source map parsing performance improvements
- Run uglify in parallel worker process(es)

    Dramatically decreased processing time for large projects on multi-core machines.

## 2.0.0 Beta 10 - Jan 2nd 2013

Changes:

- Fix handling of styleRoot in mixins.

## 2.0.0 Beta 10 - Dec 26th 2012

Changes:

- Added support for source maps

- Update mixin handling for namespaces

  This allows different mixins to define mixins with the same name. Consumers can differentiate
  between the mixins via the `library` attribute on the mixin reference. i.e.

  ```
  "mixins": [
    {"name": "test", "library": "phoenix-build"}
  ]
  ```

  All mixin projects must now define a name field so they may be referenced in this manner.

- Fix incorrect configuration load when using watch mode.
- Fix watch cleanup on file removal.

## 2.0.0 Beta 9 - Dec 21st 2012

Changes:

- Filter duplicate files in the same module

  This behavior may be disabled on the resource level via the `"duplicate": true`
  attribute or at the application level with the `"filterDuplicates": false` top level
  attribute.

- Files added through pattern mapping and auto-includes no longer require a config
  change to watch for changes.

- Allow for disabling of all alliases with `"aliases": false`

- Fix CoffeeScript plugin (@jasonwebster)

## 2.0.0 Beta 8 - Dec 16th 2012

Changes:

- Implement source warning framework

- Update to Uglify 2.2

  NPM will refuse to install this under 0.8 and lower due to an upstream dependency so this is
  now optional.

- Fix filtering of generated resources

## 2.0.0 Beta 7 - Dec 11th 2012

Changes:

- Add support for mixin file references via. mixin resource attribute.

    {"src": "lumbar-loader-backbone.js", "mixin": "lumbar-loader"},

  Mixins must define a name value in the mixin config file to utilize this feature.

- Fix template auto-include in mixin contexts

- Fix execution error in coffeescript plugin (needs unit tests)

## 2.0.0 Beta 6 - Dec 4th 2012

Changes:

- Add `template.root` property for template prefix stripping.

- Removed precompiled template template.

  Moving forward template templates should use `{{handlebarsCall}}` to differentiate between
  precompiled and client compiled mode.

## 2.0.0 Beta 5 - Nov 25th 2012

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


## 2.0.0 Beta 4 - Nov 5th 2012

Changes:

- Allow specific modules to disable particular aliases.


## 2.0.0 Beta 3 - Oct 25th 2012

Changes:

- Improves EMFILE error handling.

- Watch unit test library updates


## 2.0.0 Beta 2 - Oct 23rd 2012

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

## 2.0.0 Beta 1 - Oct 9th 2012

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
