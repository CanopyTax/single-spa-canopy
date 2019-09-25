import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/single-spa-canopy.js',
  output: {
    file: 'lib/single-spa-canopy.js',
    name: 'single-spa-canopy',
    format: 'umd',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    })

  ]
}
