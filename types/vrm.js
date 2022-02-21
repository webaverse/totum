const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'vrm.js'), 'utf8');
// const cwd = process.cwd();

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
  load(id) {
    id = createRelativeFromAbsolutePath(id);

    let components = [];
    (() => {
      const match = id.match(/#([\s\S]+)$/);
      if (match) {
        const q = new URLSearchParams(match[1]);
        const qComponents = q.get('components');
        if (qComponents !== undefined) {
          components = jsonParse(qComponents) ?? [];
        }
      }
    })();

    const code = fillTemplate(templateString, {
      srcUrl: JSON.stringify(id),
      components: JSON.stringify(components),
    });
    return {
      code,
      map: null,
    };
  },
};