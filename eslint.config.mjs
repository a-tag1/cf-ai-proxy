export default {
  ignorePatterns: ['dist', '.wrangler'],
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'warn',
  },
};
