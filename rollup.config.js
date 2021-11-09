import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/single-spa-canopy.js',
  output: [
    {
      file: 'lib/amd/single-spa-canopy.min.js',
      format: 'amd',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'lib/system/single-spa-canopy.min.js',
      format: 'system',
      sourcemap: true,
      exports: 'named',
    }
  ],
  plugins: [
    nodeResolve(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
    }),
    terser(),
  ]
}
