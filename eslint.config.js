import { configBase } from '@salutejs/eslint-config';

export default [
    ...configBase,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
