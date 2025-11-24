import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginAstro from "eslint-plugin-astro";
import angularEslint from "@angular-eslint/eslint-plugin";
import angularEslintTemplate from "@angular-eslint/eslint-plugin-template";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

const baseConfig = tseslint.config({
  extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
  rules: {
    "no-console": "warn",
    "no-unused-vars": "off",
  },
});

const angularConfig = tseslint.config({
  files: ["**/*.ts"],
  extends: [...tseslint.configs.recommended],
  plugins: {
    "@angular-eslint": angularEslint,
  },
  rules: {
    ...angularEslint.configs.recommended.rules,
    "@angular-eslint/directive-selector": [
      "error",
      {
        type: "attribute",
        prefix: "app",
        style: "camelCase",
      },
    ],
    "@angular-eslint/component-selector": [
      "error",
      {
        type: "element",
        prefix: "app",
        style: "kebab-case",
      },
    ],
  },
});

const angularTemplateConfig = tseslint.config({
  files: ["**/*.html"],
  plugins: {
    "@angular-eslint/template": angularEslintTemplate,
  },
  rules: {
    ...angularEslintTemplate.configs.recommended.rules,
  },
});

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  baseConfig,
  angularConfig,
  angularTemplateConfig,
  eslintPluginAstro.configs["flat/recommended"],
  eslintPluginPrettier
);
