module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:boundaries/recommended'],
  plugins: ['boundaries'],
  ignorePatterns: ['coverage/', '**/_boundary_probe.ts', '**/_hex_probe.ts'],
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
    'boundaries/elements': [
      { type: 'app', pattern: ['App.tsx', 'src/app/*'] },
      { type: 'features', pattern: 'src/features/*', capture: ['feature'] },
      { type: 'shared', pattern: 'src/shared/*' },
      { type: 'data', pattern: 'src/data/*' },
      { type: 'core', pattern: 'src/core/*' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        policies: [
          {
            from: { element: { type: 'app' } },
            allow: {
              to: {
                element: {
                  types: {
                    anyOf: ['app', 'features', 'shared', 'data', 'core'],
                  },
                },
              },
            },
          },
          {
            from: { element: { type: 'data' } },
            allow: {
              to: { element: { types: { anyOf: ['data', 'core'] } } },
            },
          },
          {
            from: { element: { type: 'features' } },
            allow: {
              to: { element: { types: { anyOf: ['shared', 'core'] } } },
            },
          },
          {
            from: { element: { type: 'features' } },
            allow: {
              to: {
                element: {
                  type: 'features',
                  captured: { feature: '{{from.captured.feature}}' },
                },
              },
            },
          },
          {
            from: { element: { type: 'shared' } },
            allow: {
              to: { element: { types: { anyOf: ['shared', 'core'] } } },
            },
          },
          {
            from: { element: { type: 'core' } },
            allow: { to: { element: { type: 'core' } } },
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['jest.setup.js'],
      env: { jest: true },
    },
    {
      files: [
        'src/features/**/*.{ts,tsx}',
        'src/shared/ui/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
            message:
              'No hard-coded hex in features/ui/app — use scene() or shared/tokens.',
          },
        ],
      },
    },
  ],
};
