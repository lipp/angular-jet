(function() {
  'use strict';

  angular.module("jet")

    .factory("$jet", ["$q", "$timeout", "$rootScope", "jet",

      function ($q, $timeout, $rootScope, jet) {
        var i = {x:0};
        var AngularPeer = function(options) {
          options = options || {};
          var ap = this;
          var scope = options.scope || $rootScope;
          var connectDefer = $q.defer();
          ap.$connected = connectDefer.promise;
          ap._connectTimeout = $timeout(function() {
            connectDefer.reject('Could not connect to: ' + options.url);
          }, options.timeout || 5000);
          this._peer = new jet.Peer({
            url: options.url,
            onOpen: function() {
              $timeout.cancel(ap._connectTimeout);
              connectDefer.resolve();
              scope.$apply();
            }
          });
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
