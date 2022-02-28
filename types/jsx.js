const fs = require('fs');
const url = require('url');
const Babel = require('@babel/core');
const fetch = require('node-fetch');
const {parseIdHash} = require('../util.js');

/* function parseQuery(queryString) {
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
} */

module.exports = {
  async load(id) {

    let src;
    if (/https?:/i.test(id)) {
      const o = url.parse(id, true);
      o.query['noimport'] = 1 + '';
      id = url.format(o);
      
      const res = await fetch(id);
      src = await res.text();
    } else {
      const p = id.replace(/#[\s\S]+$/, '');
      src = await fs.promises.readFile(p, 'utf8');
    }

    const {
      contentId,
      name,
      description,
      components,
    } = parseIdHash(id);
    
    const spec = Babel.transform(src, {
      presets: ['@babel/preset-react'],
      // compact: false,
    });
    let {code} = spec;

    code += `

export const contentId = ${JSON.stringify(contentId)};
export const name = ${JSON.stringify(name)};
export const description = ${JSON.stringify(description)};
export const components = ${JSON.stringify(components)};
`;
    return {
      code,
      map: null,
    };
  },
};
