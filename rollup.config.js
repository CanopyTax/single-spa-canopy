import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/single-spa-canopy.js',
  // Resolved by the host page's import map at runtime, not bundled. Without this
  // nodeResolve tries to find it in node_modules, where it does not exist.
  external: ['@canopytax/error-logging'],
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
    },
    {
      file: 'lib/esm/single-spa-canopy.min.js',
      format: 'es',
      sourcemap: true,
      exports: 'named',
    }
  ],
  plugins: [
    commonjs(),
    nodeResolve(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
    }),
    terser(),
  ]
}
