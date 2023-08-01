import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/ExternalMonitoring.ts',
        output: {
            file: 'lib/external-monitoring.js',
            format: 'iife',
        },
        plugins: [
            typescript({
                target: 'ES2015',
                module: 'ESNext',
            }),
            nodeResolve(),
            terser(),
        ],
    },
];
