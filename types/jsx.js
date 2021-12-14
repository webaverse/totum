const Babel = require('@babel/core');

const cwd = process.cwd();

function parseQuery(queryString) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    const k = decodeURIComponent(pair[0]);
    if (k) {
      const v = decodeURIComponent(pair[1] || '');
      query[k] = v;
    }
  }
  return query;
}

module.exports = {
  transform(src, id) {
    if (!id.startsWith(cwd + '/public/')) {
      const components = (() => {
        const match = id.match(/#([\s\S]+)$/);
        if (match) {
          const q = parseQuery(match[1]);
          return q.components !== undefined ? JSON.parse(q.components) : [];
        } else {
          return [];
        }
      })();
      
      const spec = Babel.transform(src, {
        presets: ['@babel/preset-react'],
        // compact: false,
      });
      let {code} = spec;
      // console.log('check id', JSON.stringify(id));
    
      code += `
export const components = ${JSON.stringify(components)};
`;
      return {
        code,
        map: null,
      };
    } else {
      return null;
    }
  },
};