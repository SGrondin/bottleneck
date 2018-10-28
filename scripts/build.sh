#!/usr/bin/env bash

set -e

if [ ! -d node_modules ]; then
	echo "[B] Run 'npm install' first"
	exit 1
fi

clean() {
  rm -f .babelrc
  rm -rf lib/*
}

makeLib() {
  echo '[B] Compiling Bottleneck to Node 6+...'
  ln -s .babelrc.lib .babelrc
  node_modules/coffeescript/bin/coffee --compile --bare --no-header --transpile src/*.coffee
  node scripts/assemble_lua.js > lib/lua.json
  mv src/*.js lib/
}

makeBundle() {
  echo '[B] Compiling Bottleneck to ES5...'
  ln -s .babelrc.bundle .babelrc
  node_modules/coffeescript/bin/coffee --compile --bare --no-header src/*.coffee
  node scripts/assemble_lua.js > lib/lua.json
  mv src/*.js lib/

  echo '[B] Assembling ES5 bundle...'
  node_modules/rollup/bin/rollup -c rollup.config.js
}

makeTypings() {
  echo '[B] Compiling and testing TS typings...'
  node_modules/ejs-cli/bin/ejs-cli bottleneck.d.ts.ejs > bottleneck.d.ts
  node_modules/typescript/bin/tsc --noEmit --strict test.ts
}

if [[ $1 = 'dev' ]]; then
  clean
  makeLib
elif [[ $1 = 'bundle' ]]; then
  clean
  makeBundle
else
  clean
  makeBundle
  clean
  makeLib
  makeTypings
fi

rm -f .babelrc

echo '[B] Done!'
