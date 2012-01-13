# Package Config Plugin #

## Introduction ##

This plugin allows a file containing a JSON payload to be inserted into the build.  The config value can be referenced using the `config`
key on the application object (defined by the application name in the lumbar.json file).

This is useful to build your application for different environments like a dev machine or QA or production.

## Example ##

With a lumbar.json as follows ( taken from [sample todos app lumbar file](https://github.com/walmartlabs/thorax-todos/blob/master/lumbar.json) )

    {
      "application": {
        "name": "Todo",
        "module": "base"
      },
      ...

And a configuration file called `dev.json`

    {
      "message": "This is a development environment",
    }

And a lumbar build

    lumbar --config dev.json outputDir

The application can use the following code to get configuration parameters:

    var message = Todo.config.message;