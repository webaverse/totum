const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'glb.js'), 'utf8');
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
  /* resolveId(source, importer) {
    console.log('resolve id', {source, importer});
    // console.log('got GLB source!!!!!!!!!!!!', {source, importer});
    return null;
  }, */
  load(id) {
    const _createRelativeFromAbsolutePath = path => {
      if (path.startsWith(cwd.replaceAll('\\','/'))) {
        path = path.slice(cwd.length);
      }
      return path;
    }

    id = _createRelativeFromAbsolutePath(id);
    
    // console.log('got GLB id!!!!!!!!!!!!!!!!!', {id, match: id.match(/#([\s\S]+)$/)});
    const components = (() => {
      const match = id.match(/#([\s\S]+)$/);
      if (match) {
        const q = parseQuery(match[1]);
        return q.components !== undefined ? JSON.parse(q.components) : [];
      } else {
        return [];
      }
    })();
    const code = fillTemplate(templateString, {
      srcUrl: id,
      components: JSON.stringify(components),
    });
    return {
      code,
      map: null,
    };
  },
};