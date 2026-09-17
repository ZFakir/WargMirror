import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser }, rules: { "no-undef": "off", "no-unused-vars": "off", "no-useless-escape": "off", "no-useless-assignment": "off" } },
  { files: ["tests/**/*.js", "playwright.config.ts", "playwright.config.js"], languageOptions: { globals: { ...globals.node, test: "readonly", expect: "readonly", describe: "readonly", it: "readonly", page: "readonly" } }, rules: { "no-unused-vars": "off" } }
]);
