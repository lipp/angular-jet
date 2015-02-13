#!/usr/bin/env sh
node node_modules/node-jet/bin/jetd.js &
sleep 2
node node_modules/node-jet/bin/some-service.js &
sleep 2
grunt test:unit

node node_modules/node-jet/examples/todo-server.js 1234 &
sleep 2
grunt test:e2e
