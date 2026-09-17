import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  { 
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { 
      globals: {
        ...globals.browser,
        api: "readonly",
        GameCard: "readonly",
        L: "readonly",
        FlagModal: "readonly",
        WARG_GAMES: "readonly",
        GAMES: "readonly",
        playModal: "readonly",
        mapModal: "readonly"
      }
    }
  },
  { files: ["tests/**/*.js", "playwright.config.ts", "playwright.config.js"], languageOptions: { globals: { ...globals.node, test: "readonly", expect: "readonly", describe: "readonly", it: "readonly", page: "readonly" } }, rules: { "no-unused-vars": "off" } }
]);
