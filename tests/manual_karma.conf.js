// Configuration file for Karma
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['Chrome'],
    reporters: ['spec', 'failed'],
    autowatch: false,
    singleRun: false,

    files: [
      '../bower_components/angular/angular.js',
      '../bower_components/angular-mocks/angular-mocks.js',
      '../bower_components/jet/deploy/jet.js',
      '../src/module.js',
      '../src/jet.js',
      '../src/**/*.js',
      'unit/**/*.spec.js'
    ]
  });
};
