const Babel = require('@babel/core');

export default function jsx(src, id) {
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