import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
  },
  {
    // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
    files: ['**/*.vue'],
    rules: {
      'vue/prefer-separate-static-class': 'off',
    },
  },
)
