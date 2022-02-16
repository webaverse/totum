const fs = require('fs');
const url = require('url');
const Babel = require('@babel/core');
const fetch = require('node-fetch');

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
  async load(id) {
    let src;
    if (/https?:/i.test(id)) {
      const o = url.parse(id, true);
      o.query.noimport = 1 + '';
      id = url.format(o);
      const res = await fetch(id);
      src = await res.text();
    } else {
      const p = id.replace(/#[\s\S]+$/, '');
      src = await fs.promises.readFile(p, 'utf8');
    }

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
      plugins: [
        ['babel-plugin-custom-import-path-transform',
          {
            transformImportPath: './packages/totum/plugins/moduleRewrite.js',
          }],
      ],
    });
    let {code} = spec;
    debugger;
    code = code.replace(/.\/https/g, '');
    code += `

export const components = ${JSON.stringify(components)};
`;
    return {
      code,
      map: null,
    };
  },
};
