/** @format */

module.exports = {
    trailingComma: 'all',
    tabWidth: 4,
    singleQuote: true,
    jsxBracketSameLine: true,
    printWidth: 140,

    overrides: [
        {
            files: '*.sol',
            options: {
                printWidth: 160,
                tabWidth: 4,
                useTabs: false,
                // singleQuote: true,
                bracketSpacing: false,
                explicitTypes: 'always',
            },
        },
    ],
};
