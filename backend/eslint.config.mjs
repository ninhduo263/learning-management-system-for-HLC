import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: ["**/.eslintrc.js", "**/docker"],
    },
    ...compat.extends(
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslintEslintPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",

            parserOptions: {
                project: "tsconfig.json",
                tsconfigRootDir: __dirname,
            },
        },

        rules: {
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            eqeqeq: [
                "error",
                "always",
                {
                    null: "ignore",
                },
            ],

            "object-shorthand": ["error", "properties"],
            "@typescript-eslint/no-shadow": "warn",
            "max-classes-per-file": "error",
            "@typescript-eslint/no-unused-vars": "warn",
        },
    },
];
