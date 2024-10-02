import antfu from '@antfu/eslint-config'

const DEFAULT_SPACE_INDENT = 4

// https://github.com/antfu/eslint-config
export default antfu(
    {
        vue: true,
        stylistic: {
            indent: DEFAULT_SPACE_INDENT,
        },
        ignores: ['**/*.y*ml'],
    },
    {
        // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
        files: ['**/*.vue'],
        rules: {
            'vue/prefer-separate-static-class': 'off',
        },
    },
)
