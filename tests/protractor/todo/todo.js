var app = angular.module('todo',['jet']);
app. controller('TodoCtrl', function Todo($scope, $jet) {
  // Create a Jet peer
  var peer = new $jet.$Peer({
    url: 'ws://localhost:1234',
    scope: $scope
  });

  // Get the todos as an array
  $scope.todos = peer.$fetch({
    path: {
      startsWith: 'todo/#'
    },
    sort: {
			byValueField: {
				id: 'number'
			},
			from: 1,
			to: 100
		}
  });


  /* Adds a new todo item */
  $scope.addTodo = function() {
    if ($scope.newTodo !== '') {
      peer.$call('todo/add', [{title: $scope.newTodo, completed: false}]);
      $scope.newTodo = '';
    }
  };

  /* Adds a random todo item */
  $scope.addRandomTodo = function () {
    $scope.newTodo = 'Todo ' + new Date().getTime();
    $scope.addTodo();
  }

  /* Removes the todo item with the inputted ID */
  $scope.removeTodo = function(todo) {
    peer.$call('todo/remove', [todo]);
  };

});
