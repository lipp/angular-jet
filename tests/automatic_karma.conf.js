// Configuration file for Karma
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['PhantomJS'],
    reporters: ['spec', 'failed', 'coverage'],
    autowatch: false,
    singleRun: true,

    preprocessors: {
      "../src/*.js": "coverage",
      "./fixtures/**/*.json": "html2js"
    },

    coverageReporter: {
      reporters: [
        {
          type: 'html',
          subdir: 'report-html'
        },
        {
          type: "lcovonly",
          dir: "coverage",
          subdir: "."
        },
        {
          type: "text-summary"
        }
      ]
    },

    files: [
      '../bower_components/angular/angular.js',
      '../bower_components/angular-mocks/angular-mocks.js',
      '../bower_components/jet/deploy/jet.js',
      'lib/**/*.js',
      '../src/module.js',
      '../src/jet.js',
      '../src/**/*.js',
      'mocks/**/*.js',
      "fixtures/**/*.json",
      'unit/**/*.spec.js'
    ]
  });
};
