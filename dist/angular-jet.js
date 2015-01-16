/*!
 * angular-jet is the officially supported AngularJS binding for Jet. angular-jet
 * provides you with the $jet service which allows you to easily keep your $scope
 * variables in sync with your Jet daemon / backend.
 *
 * angular-jet 0.0.0
 * https://github.com/lipp/angular-jet/
 * Date: 01/16/2015
 * License: MIT
 */
(function(exports) {
  "use strict";

  angular.module("jet", [])
    //todo use $window
    .value("jet", exports.jet);

})(window);

(function() {
  'use strict';

  angular.module("jet")

  .factory("$jet", ["$q", "$timeout", "$rootScope", "jet",

  function ($q, $timeout, $rootScope, jet) {

    // constructor for a new angular peer object
    var AngularPeer = function(options) {
      options = options || {};

      var scope = this.$scope = options.scope || $rootScope;
      var connectDefer = $q.defer();
      this.$connected = connectDefer.promise;

      var connectTimeout = $timeout(function() {
        connectDefer.reject('Could not connect to: ' + options.url);
      }, options.timeout || 5000);

      var peer = this._peer = new jet.Peer({
        url: options.url,
        onOpen: function() {
          $timeout.cancel(connectTimeout);
          connectDefer.resolve();
          scope.$apply();
        }
      });

      scope.$on('$destroy', function() {
        peer.close();
      });
    };

    AngularPeer.prototype.$call = function(path, args) {
      var defer = $q.defer();
      var scope = this.$scope;
      var peer = this._peer;
      this.$connected.then(function() {
        peer.call(path, args || [], {
          success: function(result) {
            defer.resolve(result);
            scope.$apply();
          },
          error: function(err) {
            defer.reject(err);
            scope.$apply();
          }
        });
      });
      return defer.promise;
    };

    // wait for states or methods to become available
    AngularPeer.prototype.$wait = function() {
      var defer = $q.defer();
      var count = 0;
      var scope = this.$scope;
      var peer = this._peer;
      var paths = Array.prototype.slice.call(arguments);
      this.$connected.then(function() {
        var fetcher = peer.fetch({
          path: {
            equalsOneOf: paths
          }
        }, function(path, event) {
          if (event === 'add') {
            ++count;
            if (count === paths.length) {
              fetcher.unfetch();
              defer.resolve();
              scope.$apply();
            }
          }
        }, {
          error: function(err) {
            defer.reject(err);
          }
        });
      });
      return defer.promise;
    };

    AngularPeer.prototype.$fetch = function(expr, scope, debounce) {
      var peer = this._peer;
      var fetchCb;
      var defer = $q.defer();
      var $fetcher;
      var debouncer;
      var peerScope = this.$scope;
      var active = false;
      scope = scope || peerScope;
      expr = expr || {}; // fetch all
      var debounceApply = function() {
        if (angular.isDefined(debouncer)) {
          $timeout.cancel(debouncer);
        }
        debouncer = $timeout(function() {
          if (active) {
            scope.$apply();
          }
          debounce = undefined;
        }, debounce || 50);
      };
      if (angular.isObject(expr.sort)) {
        expr.sort.asArray = true;
        $fetcher = [];
        fetchCb = function(arr) {
          arr.forEach(function(state, i) {
            if (typeof state.value === 'object') {
              $fetcher[i] = state.value;
            } else {
              $fetcher[i] = $fetcher[i] || {}
              $fetcher[i].value = state.value;
            }
            $fetcher[i].$index = state.index;
            $fetcher[i].$path = state.path;
            $fetcher[i].$save = function() {
              peer.set(state.path, $fetcher[i]);
            };
          });
          $fetcher.length = arr.length;
          debounceApply();
        };
      } else {
        $fetcher = {};
        fetchCb = function(path, event, value) {
          if (event === 'remove') {
            delete $fetcher[path];
          } else if (angular.isDefined(value)) {
            $fetcher[path] = value;
          }
          debounceApply();
        };
      }
      this.$connected.then(function() {
        $fetcher.$ref = peer.fetch(expr, fetchCb, {
          success: function() {
            if (scope && scope !== peerScope) {
              scope.$on('$destroy', function() {
                $fetcher.$ref.unfetch();
                active = false;
                $fetcher.$active = false;
              });
            }
            active = true;
            $fetcher.$active = true;
            defer.resolve($fetcher);
            scope.$apply();
          },
          error: function(err) {
            defer.reject(err.message);
            scope.$apply();
          }
        });
      });
      $fetcher.$scope = scope;
      $fetcher.$active = false;
      $fetcher.$ready = defer.promise;
      $fetcher.$unfetch = function() {
        var defer = $q.defer();
        $fetcher.$ready.then(function() {
          $fetcher.$ref.unfetch();
          active = false;
          $fetcher.$active = false;
          defer.resolve();
        });
        return defer.promise;
      };

      return $fetcher;
    };

    AngularPeer.prototype.$close = function() {
      this._peer.close();
    };

    return {
      $Peer: AngularPeer
    };

  }
  ]);
})();
