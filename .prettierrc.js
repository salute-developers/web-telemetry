import saluteJsPrettierConfig from '@salutejs/prettier-config';

export default {
    ...saluteJsPrettierConfig,
    plugins: ['prettier-plugin-packagejson'],
    overrides: [
        {
            files: '*.{json,md,yaml,yml}',
            options: {
                tabWidth: 2,
            },
        },
    ],
};
