#!/usr/bin/env sh
if [ -f /tmp/init_jet ]; then
    echo "Jet already started."
else
    echo "Starting Jet!"
    node node_modules/.bin/jetd.js &
    sleep 1
    node node_modules/.bin/some-service.js &
    sleep 1
    node node_modules/node-jet/examples/todo-server.js 1234 &
    sleep 1
    touch /tmp/init_jet
fi
