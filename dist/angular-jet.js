/*!
 * angular-jet is the officially supported AngularJS binding for Jet. angular-jet
 * provides you with the $jet service which allows you to easily keep your $scope
 * variables in sync with your Jet daemon / backend.
 *
 * angular-jet 0.0.0
 * https://github.com/lipp/angular-jet/
 * Date: 01/21/2015
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

      var closeDefer = $q.defer();
      this.$closed = closeDefer.promise;

      var connectTimeout = $timeout(function() {
        connectDefer.reject('Could not connect to: ' + options.url);
      }, options.timeout || 5000);

      var destroyingScope = false;

      var peer = this._peer = new jet.Peer({
        url: options.url,
        onOpen: function() {
          $timeout.cancel(connectTimeout);
          connectDefer.resolve();
          scope.$apply();
        },
        onClose: function() {
          closeDefer.resolve();
          if (!destroyingScope) {
            scope.$apply();
          }
        }
      });

      var that = this;
      that.$$closed = false;
      scope.$on('$destroy', function() {
        that.$$closed = true;
        destroyingScope = true;
        peer.close();
      });
    };

    AngularPeer.prototype.$$peerCall = function(peerMethod, path, params, valueAsResult) {
      var defer = $q.defer();
      var scope = this.$scope;
      var peer = this._peer;
      this.$connected.then(function() {
        peer[peerMethod](path, params, {
          valueAsResult: valueAsResult,
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

    AngularPeer.prototype.$call = function(path, args) {
      if (angular.isDefined(args) && typeof args !== 'object') {
        throw new Error('second arg to $call must be undefined, Array or Object');
      }
      return this.$$peerCall('call', path, args || []);
    };

    AngularPeer.prototype.$set = function(path, value, valueAsResult) {
      return this.$$peerCall('set', path, value, valueAsResult);
    };

    // wait for states or methods to become available
    AngularPeer.prototype.$wait = function() {
      var defer = $q.defer();
      var count = 0;
      var scope = this.$scope;
      var peer = this._peer;
      var elements = {};
      var paths = Array.prototype.slice.call(arguments);
      this.$connected.then(function() {
        var fetcher = peer.fetch({
          path: {
            equalsOneOf: paths
          }
        }, function(path, event, value) {
          if (event === 'add') {
            if (angular.isDefined(value)) {
              elements[path] = new AngularFetchedState({
                path: path,
                value: value
              }, peer, scope);
            } else {
              elements[path] = new AngularFetchedMethod({
                path: path
              }, peer, scope);
            }
            ++count;
            if (count === paths.length) {
              fetcher.unfetch();
              defer.resolve();
              scope.$apply();
            }
          } else if (event === 'remove') {
            delete elements[path];
            --count;
          } else {
            elements[path].$value = value;
          }
        }, {
          error: function(err) {
            defer.reject(err);
          }
        });
      });
      return defer.promise;
    };

    var AngularFetchedState = function(state, angularPeer, scope, fetcher) {
      this.$index = state.index; // optional, undefined for non-sorting fetches
      this.$path = state.path;
      this.$value = state.value;
      this.$lastValue = angular.copy(state.value);
      var that = this;
      that.$$saving = 0;

      if (fetcher && fetcher.$$autoSave) {
        that.$$unwatch = scope.$watch(function() {
          return that.$value;
        }, function(newVal, oldVal) {
          if (!angular.equals(newVal, oldVal) && fetcher.$$applyingFetch === false) {
            if (that.$$reverting) {
              that.$$reverting = false;
              return;
            }
            ++that.$$saving;
            that.$save().then(function(){
              --that.$$saving;
              //that.$lastValue = angular.copy(oldVal);
              delete that.$error;
            }, function(err) {
              --that.$$saving;
              that.$revert = function() {
                that.$$reverting = true;
                that.$value = angular.copy(that.$lastValue);
                delete that.$error;
              };
              that.$error = err;
            });
          }
        }, true);
      }
      that.$save = function(valueAsResult) {
        return angularPeer.$set(this.$path, this.$value, valueAsResult);
      };
    };

    AngularPeer.prototype.$fetch = function(expr, scope) {
      var peer = this._peer;
      var fetchCb;
      var defer = $q.defer();
      var $fetcher;
      var debouncer;
      var peerScope = this.$scope;
      var active = false;
      var angularPeer = this;
      scope = scope || peerScope;
      expr = expr || {}; // fetch all
      var debounceApply = function() {
        if (angular.isDefined(debouncer)) {
          $timeout.cancel(debouncer);
        }
        debouncer = $timeout(function() {
          if (active) {
            $fetcher.$$applyingFetch = true;
            scope.$apply();
            $fetcher.$$applyingFetch = false;
          }
          debouncer = undefined;
        }, $fetcher.$$debounce);
      };
      if (angular.isObject(expr.sort)) {
        expr.sort.asArray = false; //manually create array
        var from = expr.sort.from || 1;
        $fetcher = [];
        var indices = {};
        fetchCb = function(changes, n) {
          changes.forEach(function(change) {
            var i = change.index - from;
            if (!angular.isDefined($fetcher[i])) {
              $fetcher[i] = new AngularFetchedState(change, angularPeer, scope, $fetcher);
            } else if (indices[change.path] !== change.index) {
              if ($fetcher[i].$$unwatch) {
                $fetcher[i].$$unwatch();
              }
            }
            if ($fetcher[i].$$saving === 0) {
              $fetcher[i].$value = change.value;
            }
            $fetcher[i].$path = change.path;
            $fetcher[i].$lastValue = angular.copy(change.value);
            indices[change.path] = change.index;
          });
          $fetcher.length = n;
          debounceApply();
        };
      } else {
        $fetcher = [];
        var indices = {};
        fetchCb = function(path, event, value) {
          var state;
          if (event === 'remove') {
            var indexToRemove = indices[path];
            $fetcher[indexToRemove].$$unwatch();
            $fetcher.splice(indexToRemove, 1);
            delete indices[path];
            angular.forEach(indices, function(value, key) {
              if (value > indexToRemove) {
                this[key] = value - 1;
              }
            }, indices);
          } else if (angular.isDefined(value)) {
            var index;
            if (event === 'add') {
              index = $fetcher.length;
              indices[path] = index;
              $fetcher.push(new AngularFetchedState({
                path: path
              }, angularPeer, scope, $fetcher));
            } else {
              index = indices[path];
            }
            if ($fetcher[index].$$saving === 0) {
              $fetcher[index].$value = value;
            }
            $fetcher[index].$lastValue = angular.copy(value);
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
      $fetcher.$autoSave = function(enable) {
        $fetcher.$$autoSave = enable;
      };
      $fetcher.$debounce = function(ms) {
        $fetcher.$$debounce = ms;
      };
      $fetcher.$$debounce = 50;
      $fetcher.$$applyingFetch = false;
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
      var peer = this._peer;
      this.$connected.then(function() {
        peer.close();
      });
    };

    return {
      $Peer: AngularPeer
    };

  }
  ]);
})();
