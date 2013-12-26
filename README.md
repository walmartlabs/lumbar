# Lumbar #

[![Build Status](https://secure.travis-ci.org/walmartlabs/lumbar.png?branch=master)](http://travis-ci.org/walmartlabs/lumbar)

Lumbar is a js-build tool that takes a _general codebase_ and list of _platforms_ to generate modular _platform specific applications_.

## Quick Start

    npm install -g lumbar

See [thorax-seed](https://github.com/walmartlabs/thorax-seed) for an example project.

## Grunt Plugin

    var port = 8000,
        publicDir = './public',
        lumbarFile = './lumbar.json';

    grunt.loadNpmTasks('lumbar');

    grunt.initConfig({
      server: {
        base: publicDir,
        port: port
      },
      lumbar: {
        // performs an initial build so when tests
        // and initial open are run, code is built
        build: {
          build: lumbarFile,
          output: publicDir
        },
        // a long running process that will watch
        // for updates, to include another long
        // running task such as "watch", set
        // background: true
        watch: {
          background: false,
          watch: lumbarFile,
          output: publicDir
        }
      }
    });

    grunt.registerTask('default', 'lumbar:build server lumbar:watch');


## History

See [release-notes](release-notes.md) for release history.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/walmartlabs/lumbar/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

