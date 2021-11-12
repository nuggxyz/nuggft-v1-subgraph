/** @format */

module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    extends: ['universe/node', 'prettier'],
    plugins: ['prettier', 'unused-imports', 'import'],
    rules: {
        'prettier/prettier': 'error',

        'no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'error',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
            },
        ],
        'import/order': [
            'error',
            {
                'newlines-between': 'always',
                groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
            },
        ],
    },
};
