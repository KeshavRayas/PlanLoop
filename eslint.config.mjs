import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base config for all TS files
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "no-console": "error"
    }
  },
  // Strict type-checked rules for non-test source files
  {
    files: ["packages/*/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "error",
      "no-console": "error"
    }
  }
);
