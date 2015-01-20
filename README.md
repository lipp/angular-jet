# angular-jet
Angular Binding for [Jet Realtime Bus](http://jetbus.io/)

# API

## $jet.$Peer([options])

Constructs a new Peer.

`options` is optional and can contain:
 - `url` : The websocket url of the Jet Daemon (default: 'ws://localhost:11123')
 - `scope` : The scope to attach this Peer to, e.g. If the Peer belongs to a controller (default: `$rootScope`)
 - `timeout` : The connect timeout in ms (default: `5000`)

```
var app = angular.module('todo',['jet']);
app. controller('TodoCtrl', function Todo($scope, $jet) {
  // Create a Jet peer
  var peer = new $jet.$Peer({
    url: 'ws://localhost:1234',
    scope: $scope
  });
...
```

## peer.$connected

Promise which gets resolved when the peer is successfully connected to the Jet
Daemon.
