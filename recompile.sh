#!/usr/bin/env bash

DIR=$(dirname $0)
pushd $DIR > /dev/null

if [[ ! -d node_modules ]]; then
	echo 'Installing compiler tools...'
	sleep 1
	npm install
fi

echo 'Compiling bottleneck...'

node_modules/coffee-script/bin/coffee -c src/*.coffee
rm lib/*.js
mv src/*.js lib/
node_modules/browserify/bin/cmd.js lib/index.js > bottleneck.js
node_modules/uglify-js/bin/uglifyjs bottleneck.js -o bottleneck.min.js

popd > /dev/null
echo 'Done!'
