#!/usr/bin/env bash

if [ ! -d node_modules ]; then
	echo 'Installing compiler tools...'
	sleep 1
	npm install
fi

node_modules/coffee-script/bin/coffee -c src/*.coffee

if [[ $1 = 'compile' ]]; then
  echo 'Compiling bottleneck...'
  rm src/*.js
else
  echo 'Building bottleneck...'
  rm lib/*.js
  mv src/*.js lib/
  node_modules/browserify/bin/cmd.js -u bluebird lib/index.js > bottleneck.js
  node_modules/uglify-js/bin/uglifyjs bottleneck.js -o bottleneck.min.js
fi
echo 'Done!'
