***
# NOTICE:

## This repository has been archived and is not supported.

[![No Maintenance Intended](http://unmaintained.tech/badge.svg)](http://unmaintained.tech/)
***
NOTICE: SUPPORT FOR THIS PROJECT HAS ENDED 

This projected was owned and maintained by Walmart. This project has reached its end of life and Walmart no longer supports this project.

We will no longer be monitoring the issues for this project or reviewing pull requests. You are free to continue using this project under the license terms or forks of this project at your own risk. This project is no longer subject to Walmart's bug bounty program or other security monitoring.


## Actions you can take

We recommend you take the following action:

  * Review any configuration files used for build automation and make appropriate updates to remove or replace this project
  * Notify other members of your team and/or organization of this change
  * Notify your security team to help you evaluate alternative options

## Forking and transition of ownership

For [security reasons](https://www.theregister.co.uk/2018/11/26/npm_repo_bitcoin_stealer/), Walmart does not transfer the ownership of our primary repos on Github or other platforms to other individuals/organizations. Further, we do not transfer ownership of packages for public package management systems.

If you would like to fork this package and continue development, you should choose a new name for the project and create your own packages, build automation, etc.

Please review the licensing terms of this project, which continue to be in effect even after decommission.

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

