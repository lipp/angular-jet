#!/usr/bin/env sh
if [ -f /tmp/init_jet ]; then
    echo "Jet already started."
else
    echo "Starting Jet!"
    node node_modules/.bin/jetd.js &
    node node_modules/.bin/some-service.js &
    touch /tmp/init_jet
fi
