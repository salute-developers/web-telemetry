import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

export default defineConfig({
    test: {
        include: ['src/**/*.spec.ts'],
        globals: true,
        environment: 'jsdom',
    },
    define: {
        __VERSION__: JSON.stringify(packageJson.version),
    },
});
