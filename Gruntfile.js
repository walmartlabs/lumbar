/*global grunt */
module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        force: true
      },
      files: [
        'lib/**/*.js',
        'test/*.js',
        'test/plugins/*.js'
      ]
    },

    mochacov: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js', 'test/plugins/*.js', 'test/util/*.js']
      },
      cov: {
        options: {
          reporter: 'html-cov'
        },
        src: ['test/*.js', 'test/plugins/*.js', 'test/util/*.js']
      },
      options: {
        require: ['./test/lib/mocha-sinon']
      }
    },

    githubPages: {
      target: {
        options: {
          // The default commit message for the gh-pages branch
          commitMessage: 'push'
        },
        // The folder where your gh-pages repo is
        src: '_site'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-cov');
  grunt.loadNpmTasks('grunt-github-pages');

  grunt.registerTask('test', ['jshint', 'mochacov:test']);
  grunt.registerTask('cov', ['mochacov:cov']);

  grunt.registerTask('docs', function() {
    this.async();


    var Static = require('static'),
        static = new Static('docs');
    static.publish('_site');
  });
  grunt.registerTask('docs-deploy', ['githubPages:target']);
};
