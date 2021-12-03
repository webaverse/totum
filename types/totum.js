const path = require('path');
const fs = require('fs');
const url = require('url');
const fetch = require('node-fetch');
const {cwd, fetchFileFromId} = require('../util.js');

const _jsonParse = s => {
  try {
    const result = JSON.parse(s);
    return {result};
  } catch(error) {
    return {error};
  }
};

/* const cwd = process.cwd();
const isSubpath = (parent, dir) => {
  const relative = path.relative(parent, dir);
  const isSubdir = !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isSubdir;
}; */

module.exports = {
  async resolveId(id, importer) {
    const s = await fetchFileFromId(id, importer, 'utf8');
    // console.log('totum fetch', {id, importer, s});
    if (s !== null) {
      const {result, error} = _jsonParse(s);
      if (!error) {
        // console.log('load metaversefile', {s, result});
        const {start_url, components} = result;
        if (start_url) {
          if (/^https?:\/\//.test(start_url)) {
            let s = '/@proxy/' + start_url;
            if (Array.isArray(components)) {
              s += '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            return s;
          } else if (/^https?:\/\//.test(id)) {
            const o = url.parse(id, true);
            o.pathname = path.join(path.dirname(o.pathname), start_url);
            
            let s = url.format(o);
            if (Array.isArray(components)) {
              s += '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            return s;
          } else if (/^\//.test(id)) {
            if (id.startsWith(cwd)) {
              id = id.slice(cwd.length);
            }
            
            const o = url.parse(id, true);
            o.pathname = path.join(path.dirname(o.pathname), start_url);
            let s = url.format(o);
            if (/^\//.test(s)) {
              s = cwd + s;
            }
            if (Array.isArray(components)) {
              s += '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            return s;
          } else {
            console.warn('.totum scheme unknown');
            return null;
          }
        } else {
          console.warn('.totum has no "start_url": string', {j, id, s});
          return null;
        }
      } else {
        console.warn('.totum could not be parsed: ' + error.stack);
        return null;
      }
    } else {
      console.warn('.totum could not be loaded');
      return null;
    }
  }
};
