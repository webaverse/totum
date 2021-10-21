const Babel = require('@babel/core');

module.exports = {
  transform(src, id) {
    const spec = Babel.transform(src, {
      presets: ['@babel/preset-react'],
      // compact: false,
    });
    const {code} = spec;
    return {
      code,
      map: null,
    };
  },
};