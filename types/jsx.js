const Babel = require('@babel/core');

module.exports = function jsx(src, id) {
  const spec = Babel.transform(src, {
    presets: ['@babel/preset-react'],
    // compact: false,
  });
  const {code} = spec;
  return {
    code,
    map: null // provide source map if available
  };
}