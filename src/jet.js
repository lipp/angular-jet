(function() {
  'use strict';

  angular.module("jet")

    .factory("$jet", ["$q", "$timeout",

      function (jet) {
        var AngularPeer = function(url, scope) {
          var ap = this;
          var connectDefer = $q.defer();
          ap.$connected = connectDefer.promise;
          ap._connectTimeout = $timeout(function() {
            connectDefer.reject('Could not connect to: ' + url);
          }, 5000);
          this._peer = new jet.Peer({
            onOpen: function() {
              $timeout.cancel(ap._connectTimeout);
              connectDefer.resolve();
            }
          });
        };

        return {
          $Peer: AngularPeer
        };

      }
    ]);
})();
