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
      var angularPeer = this;
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
              }, angularPeer, scope);
            } else {
              elements[path] = new AngularFetchedMethod({
                path: path
              }, angularPeer);
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

    var AngularFetchedMethod = function(path, angularPeer) {
      this.$path = path;
      this.$call = function(args) {
        return angularPeer.$call(path, args);
      };
    };

    AngularFetchedMethod.prototype.$$unwatch = function() {
    };

    var AngularFetchedState = function(state, angularPeer, scope, fetcher) {
      this.$index = state.index; // optional, undefined for non-sorting fetches
      this.$path = state.path;
      this.$value = state.value;
      this.$fetchedValue = angular.copy(state.value);
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
              //that.$fetchedValue = angular.copy(oldVal);
              delete that.$error;
            }, function(err) {
              --that.$$saving;
              that.$revert = function() {
                that.$$reverting = true;
                that.$value = angular.copy(that.$fetchedValue);
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

    var AngularFetcher = function(opts) {
      var fetcher = this;
      fetcher.$$readyDefer = $q.defer();
      fetcher.$ready = fetcher.$$readyDefer.promise;
      fetcher.$$autoSave = true;
      fetcher.$$debounce = 50;
      fetcher.$$applyingFetch = false;
      fetcher.$getScope = function() {
        return opts.scope || opts.peer.$scope;
      };
      fetcher.$$hasOwnScope = angular.isDefined(opts.scope);
      fetcher.$active = false;
      fetcher.$$getAngularPeer = function() {
        return opts.peer;
      };
      return fetcher;
    };

    AngularFetcher.prototype = Object.create(Array.prototype);

    AngularFetcher.prototype.$autoSave = function(enable) {
      if (angular.isDefined(enable)) {
        this.$$autoSave = enable;
      } else {
        return this.$$autoSave;
      }
    };

    AngularFetcher.prototype.$debounce = function(ms) {
      if (angular.isDefined(ms)) {
        this.$$debounce = ms;
      } else {
        return this.$$debounce;
      }
    };

    AngularFetcher.prototype.$unfetch = function() {
      var defer = $q.defer();
      var that = this;
      this.$ready.then(function() {
        that.$ref.unfetch();
        that.$active = false;
        defer.resolve();
      });
      return defer.promise;
    };

    AngularFetcher.prototype.debounceApply = function() {
      var that = this;
      if (angular.isDefined(this.$$debouncer)) {
        $timeout.cancel(this.$$debouncer);
      }
      this.$$debouncer = $timeout(function() {
        if (that.$active) {
          that.$$applyingFetch = true;
          that.$getScope().$apply();
          that.$$applyingFetch = false;
        }
        that.$$debouncer = undefined;
      }, this.$$debounce);
    };

    AngularFetcher.prototype.$$createSortedFetchCb = function(expr) {
      var indices = {};
      expr.sort.asArray = false; //manually create array
      var from = expr.sort.from || 1;
      var that = this;
      var angularPeer = this.$$getAngularPeer();
      var scope = this.$getScope();
      var fetchCb = function(changes, n) {
        var moves = [];
        var remove = {};
        changes.forEach(function(change) {
          var i = change.index - from;
          var isState = angular.isDefined(change.value);
          var entry;
          var oldIndex = indices[change.path];
          var newIndex = change.index - from;
          if (!angular.isDefined(oldIndex)) {
            // need to create new element?
            if (isState) {
              entry = new AngularFetchedState(change, angularPeer, scope, that);
            } else {
              entry = new AngularFetchedMethod(change.path, angularPeer);
            }
          } else {
            // grab existing element
            entry = that[oldIndex];
          }
          if (isState) {
            if (entry.$$saving === 0) {
              entry.$value = change.value;
              entry.$fetchedValue = angular.copy(change.value);
            }
          }
          // needs to be moved?

          if (oldIndex !== newIndex) {
            indices[change.path] = newIndex;
            entry.$index = change.index;
            if (angular.isDefined(oldIndex)) {
              remove[oldIndex] = that[oldIndex];
            }
            delete remove[newIndex];
            moves.push({
              to: newIndex,
              entry: entry
            });
          }
        });
        moves.forEach(function(move) {
          that[move.to] = move.entry;
        });
        angular.forEach(remove,function(rem) {
          if (rem.$$unwatch) {
            rem.$$unwatch();
          }
        });
        that.length = n;
        that.debounceApply();
      };
      return fetchCb;
    };

    AngularFetcher.prototype.$$createUnsortedFetchCb = function(expr) {
      var indices = {};
      var that = this;
      var angularPeer = this.$$getAngularPeer();
      var scope = this.$getScope();

      var fetchCb = function(path, event, value) {
        if (event === 'remove') {
          var indexToRemove = indices[path];
          that[indexToRemove].$$unwatch();
          that.splice(indexToRemove, 1);
          delete indices[path];
          angular.forEach(indices, function(value, key) {
            if (value > indexToRemove) {
              this[key] = value - 1;
            }
          }, indices);
        } else if (angular.isDefined(value)) {
          var index;
          if (event === 'add') {
            index = that.length;
            indices[path] = index;
            that.push(new AngularFetchedState({
              path: path
            }, angularPeer, scope, that));
          } else {
            index = indices[path];
          }
          if (that[index].$$saving === 0) {
            that[index].$value = value;
          }
          that[index].$fetchedValue = angular.copy(value);
        }
        that.debounceApply();
      };
      return fetchCb;
    };

    AngularFetcher.prototype.$$fetch = function(expr) {
      var that = this;
      var fetchCb;
      if (angular.isDefined(expr.sort)) {
        fetchCb = this.$$createSortedFetchCb(expr);
      } else {
        fetchCb = this.$$createUnsortedFetchCb(expr);
      }
      this.$$getAngularPeer().$connected.then(function() {
        that.$ref = that.$$getAngularPeer()._peer.fetch(expr, fetchCb, {
          success: function() {
            if (that.$$hasOwnScope) {
              that.$getScope().$on('$destroy', function() {
                that.$ref.unfetch();
                that.$active = false;
              });
            }
            that.$active = true;
            that.$$readyDefer.resolve(that);
            that.$getScope().$apply();
          },
          error: function(err) {
            that.$$readyDefer.reject(err.message);
            that.$getScope().$apply();
          }
        });
      });

    };


    AngularPeer.prototype.$fetch = function(expr, scope) {
      var fetcher = new AngularFetcher({
        peer: this,
        scope: scope
      });

      fetcher.$$fetch(expr || {});
      return fetcher;
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
