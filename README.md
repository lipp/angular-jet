# angular-jet
Angular Binding for [Jet Realtime Bus](http://jetbus.io/)

# API

## $jet.$Peer([options]) // function (ctor)

Constructs a new Peer.

`options` is optional and can contain:
 - `url` : The websocket url of the Jet Daemon (default: 'ws://localhost:11123')
 - `scope` : The scope to attach this Peer to, e.g. If the Peer belongs to a controller (default: `$rootScope`)
 - `timeout` : The connect timeout in ms (default: `5000`)

```javascript
// example from todo app
var app = angular.module('todo',['jet']);
app. controller('TodoCtrl', function Todo($scope, $jet) {
  // Create a Jet peer
  var peer = new $jet.$Peer({
    url: 'ws://localhost:1234',
    scope: $scope
  });
...
```

The Peer and all fetches created by a peer instance are attached to to scope provided.
Cleanup is performed automatically during scope $on $destroy. If no scope is provided
(if the Peer is used from within a service) it defaults to $rootScope.

## peer.$connected // Promise

Promise which gets resolved when the peer is successfully connected to the Jet
Daemon or rejected if the connect timeout expires.

## peer.$closed // Promise

Promise which gets resolved then the Peer connection to the daemon has been closed.

## {Promise} completed = peer.$set(path, value, [valueAsResult]) // function

Sets the State specified by path to the given value. Returns a promise which gets
resolved if setting the State value returned no error.

The resolve callback argument is true or - if valueAsResult=true - the new State's value.
Note that depending on the owning Peer's implementation may implement custom behaviour when setting the
State and the State may have actually another value then the one passed to set as
argument.

In case of an error, the promise gets rejected with the error as callback argument.
The error is a JSON-RPC error Object (containing: code, message and optionally data).

## {Promise} completed = peer.$call(path, [object_or_array]) // function

Calls the Method specified by path with the given argument. The argument must be either
an Object or an Array or undefined.

Returns a promise resolving with the result as argument or rejecting with the error
as argument. The error is an JSON-RPC error object (containing: code, message and optionally data).


## {FetchedArray} fa = peer.$fetch(rule, [scope]) // function

Fetches all States matching the fetch rule. Fetching is like having a realtime query,
which updates as the queried data gets modified, added or removed.
The return value is an auto-synced FetchArray containing all matching States.

The supported fields of rule are:

- `path`: {Object, Optional} For path based fetches
- `value`: {Object, Optional} For value based fetches
- `valueField`: {Object, Optional} For valuefield based fetches
- `sort`: {Object, Optional} For sorted fetches

A scope can be provided optionally and defaults to the peer's scope.

```javascript
// example from todo app
$scope.todos = peer.$fetch({
  path: {
    startsWith: 'todo/#'
  }
});

```

```javascript
// fetch the top ten female players
// a player may look like this:
// {
//  name: 'Foo',
//  gender: 'male',
//  score: 12345
// }
$scope.todos = peer.$fetch({
  path: {
    startsWith: 'players/#'
  },
  valueField: {
    gender: {
      equals: 'female'
    }
  },
  sort: {
    from: 1,
    to: 10,
    byValueField: {
      score: 'number'
    }
  }
});

```


# FetchArray

A FetchArray can be created by calling peer.$fetch(...). In addition to the Javascript Array
functionality (containing the FetchedStates), methods are exposed. The FetchArray is automatically
removed ($unfetched) during scope $on $destroy.

## {Promise} unfetched = FetchArray.$unfetch() // function

Unregisters the fetch expression at the Jet Daemon. Returns a promise which is
resolved when the unregistration process is complete. This function is automatically
called with scope $on $destroy.

## FetchArray.$autoSave(enable) // function

Enables or disables auto-save functionality of the contained State $values. E.g. if enabled,
there is no need to call state.$save() on model change.

## FetchArray.$debounce(ms) // function

Sets the scope $apply debounce time for remote State changes. Defaults to 50ms.

## FetchArray.$ready // Promise

Promise which gets resolved as soon as the fetch expression has been successfully
added to the Jet Daemon.

# FetchedState

FetchedStates are the content of a FetchArray. They cannot be created "manually".

## FetchedState.$value // any non-function type

The State's (Jet) value. Can be of any type. If the corresponding $fetcher is
configured as autoSync (default), this $value is automatically $watched within the scope
and changes are applied as the model changes. That means you MUST NOT call FetchedStates.$save()
to sync changes to the (remote) State.

While changes are applied FetchedState.$value may differ from FetchedState.$fetchedValue.

## FetchedState.$path // string

The State's (Jet) path. The $path is a string and identifies the State.

## {Promise} completed = FetchedState.$save([valueAsResult]) // function

Sets the (remote) State to the current $value.

Behaves exactly like peer.$set(FetchedState.$path, FetchedState.$value, valueAsResult).

## FetchedState.$index // number

Number, only present for "sorted" FetchArray. The index within [sort.from,sort.to] range.

## FetchedState.$error // Object

Error object containing code, message and optionally data of a failed
FetchedState.$save operation. The FetchedState.$save operation may be triggered
by local model changes to FetcheState.$value.

## FetchedState.$fetchedValue // any non-function type

The current fetched value, which may differ from a not-yet applied change of FetchedState.$value.

## FetchedState.$revert() // function

Locally sets FetchedState.$value to FetchedState.$fetchedValue and deletes
FetchedState.$error.
