#!/usr/bin/env sh
node node_modules/node-jet/bin/jetd.js
sleep 3
grunt test:unit
