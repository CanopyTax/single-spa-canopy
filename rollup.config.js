import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'

export default [
  {
    input: 'src/single-spa-canopy.js',
    output: {
      file: 'lib/umd/single-spa-canopy.min.js',
      name: 'single-spa-canopy',
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser(),
    ]
  },
  {
    input: 'src/single-spa-canopy.js',
    output: {
      file: 'lib/system/single-spa-canopy.min.js',
      format: 'system',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser(),
    ]
  }
]
