import { configBase, configPrettier, createConfig, saluteRules } from '@salutejs/eslint-config';

export default createConfig(
    configBase,
    configPrettier,
    {
        rules: {
            ...saluteRules,
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        ignores: ['lib/*', 'esm/*', 'node_modules/*'],
    },
);
