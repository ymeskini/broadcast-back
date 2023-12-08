module.exports = {
  extends: ['@ymeskini/eslint-config'],
  env: {
    jest: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
