#!/usr/bin/env bash

set -e

if [ ! -d node_modules ]; then
	echo "Running 'npm install' first"
	sleep 1
	npm install
fi

node_modules/coffeescript/bin/coffee -c src/*.coffee

rm -rf lib/*
node scripts/assemble_lua.js > lib/lua.json
mv src/*.js lib/

if [[ $1 = 'compile' ]]; then
  echo 'Compiling bottleneck...'
else
  echo 'Building bottleneck...'
  node_modules/browserify/bin/cmd.js -u redis lib/index.js > bottleneck.js
  node_modules/uglify-es/bin/uglifyjs bottleneck.js -o bottleneck.min.js
fi
echo 'Done!'
