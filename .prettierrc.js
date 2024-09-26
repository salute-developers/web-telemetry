import salutejsPrettierConfig from '@salutejs/prettier-config';

const { parser, ...config } = salutejsPrettierConfig;

export default {
    ...config,
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
