var protractor = require('protractor');
var jet = require('node-jet');

describe('Todo App', function () {
  // Reference to the todos repeater
  var todos = element.all(by.repeater('todo in todos'));
  var flow = protractor.promise.controlFlow();

  function waitOne() {
    return protractor.promise.delayed(500);
  }

  function sleep() {
    return flow.execute(waitOne);
  }

  var peer = new jet.Peer({
    url: 'ws://localhost:1234'
  });

  peer.call('todo/removeAll');

  beforeEach(function () {

    // Navigate to the todo app
    browser.get('todo/todo.html');

  });

  it('loads', function () {
  });

  it('has the correct title', function () {
    expect(browser.getTitle()).toEqual('Angular Jet Todo e2e Test');
  });

  it('starts with an empty list of Todos', function () {
    expect(todos.count()).toBe(0);
  });

  it('adds new Todos', function () {
    // Add three new todos by typing into the input and pressing enter
    var newTodoInput = element(by.model('newTodo'));
    newTodoInput.sendKeys('Buy groceries\n');
    newTodoInput.sendKeys('Run 10 miles\n');
    newTodoInput.sendKeys('Build Firebase\n');

    sleep();

    expect(todos.count()).toBe(3);
  });

  it('adds random Todos', function () {
    // Add a three new random todos via the provided button
    var addRandomTodoButton = $('#addRandomTodoButton');
    addRandomTodoButton.click();
    addRandomTodoButton.click();
    addRandomTodoButton.click();

    sleep();

    expect(todos.count()).toBe(6);
  });

  it('removes Todos', function () {
    // Remove two of the todos via the provided buttons
    $('.todo:nth-of-type(2) .removeTodoButton').click();
    $('.todo:nth-of-type(3) .removeTodoButton').click();

    sleep();

    expect(todos.count()).toBe(4);
  });

  it('changes are saved', function(done) {
    var fetcher = peer.fetch({
      valueField: {
        title: {
          equals: 'Buy groceries'
        }
      }
    }, function(path, event, value) {
      if (event === 'change') {
        expect(value.completed).toBe(true);
        fetcher.unfetch();
        done();
      }
    });

    $('.todo:nth-of-type(1) .toggle').click();

  });

  it('updates when a new Todo is added remotely', function () {
    // Simulate a todo being added remotely
    peer.call('todo/add',[{
      title: 'Wash the dishes',
      completed: false
    }]);
    sleep();
    expect(todos.count()).toBe(5);
  });

  it('updates when an existing Todo is removed remotely', function () {
    // Simulate a todo being removed remotely
    var fetcher = peer.fetch({
      path: {
        startsWith: 'todo/#'
      },
      sort: {
        from: 1,
        to: 1
      }
    }, function(changes) {
      fetcher.unfetch();
      peer.call('todo/remove',[changes[0].value]);
    });
    sleep();
    expect(todos.count()).toBe(4);
  });


});
