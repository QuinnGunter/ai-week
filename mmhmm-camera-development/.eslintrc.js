module.exports = {
    extends: ["eslint:recommended"],
    root: true,
    env: {
        "browser": true,
        "es6": true,
    },
    parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
    },
    rules: {
        "prefer-rest-params": [
            "off",
            "never",
        ],
        "indent": [
            "off",
            4,
            { "SwitchCase": 1 },
        ],
        "linebreak-style": [
            "warn",
            "unix",
        ],
        "quotes": [
            "off",
            "double",
        ],
        "semi": [
            "off",
            "always",
        ],
        "comma-dangle": [
            "off",
            "always-multiline",
        ],
        "space-before-function-paren": [
            "off",
            "never",
        ],
        "space-before-blocks": [
            "off",
            "always",
        ],
        "no-unused-vars": [
            "off",
            "never"
        ],
        "no-undef": [
            "off",
            "never"
        ],
        "no-inner-declarations": [
            "off",
            "never"
        ],
        "no-debugger": [
            "off"
        ],
        "no-async-promise-executor": [
            "off"
        ],
        "no-prototype-builtins": [
            "off"
        ]
    },
};
