'use strict';

module.exports = {
  extends: ['kintone'],
  'parserOptions': {
    'ecmaVersion': 8
  },
  'globals': {
    'kintoneJSSDK': true,
    'kintoneUIComponent': true,
    'List': true,
    'interact': true
  },
  'rules': {
    'max-statements': [
      'error', 80
    ]
  }
};
