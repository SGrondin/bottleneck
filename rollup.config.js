import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';


export default {
  input: 'lib/bundle.js',
  output: {
    name: 'Bottleneck',
    file: 'es5.js',
    sourcemap: false,
    globals: {},
    format: 'umd'
  },
  external: [],
  plugins: [
    json(),
    resolve(),
    commonjs(),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};
