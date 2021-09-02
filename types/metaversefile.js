const path = require('path');
const fs = require('fs');
const url = require('url');
const fetch = require('node-fetch');
const {fetchFileFromId} = require('../util.js');

const cwd = process.cwd();

const _jsonParse = s => {
  try {
    return JSON.parse(s);
  } catch(e) {
    return null;
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
    console.log('metaversefile fetch', {id, importer, s});
    if (s !== null) {
      const j = _jsonParse(s);
      console.log('load metaversefile', {s}, j);
      const start_url = j?.start_url;
      if (start_url) {
        if (id.startsWith(cwd)) {
          id = id.slice(cwd.length);
        }
        
        const o = url.parse(id);
        console.log('new metaversefile id 1', {id, importer, start_url, o}, [path.dirname(o.pathname), start_url]);
        o.pathname = path.join(path.dirname(o.pathname), start_url);
        let s = url.format(o);
        if (/^\//.test(s)) {
          s = cwd + s;
        }
        console.log('new metaversefile id 2', {id, importer, start_url, o, s}, [path.dirname(o.pathname), start_url]);
        return s;
      } else {
        console.warn('.metaversefile has no "start_url": string', {j, id, s});
        return null;
      }
    } else {
      console.warn('.metaversefile could not be parsed');
      return null;
    }
    
    /* const j = _jsonParse(src);
    const start_url = j?.start_url;
    if (typeof start_url === 'string') {
      console.log('got id', {id, start_url});
      const code = `console.log('got metaversefile');`;
      return {
        code,
        map: null // provide source map if available
      };
    } else {
      console.warn('.metaversefile has no "start_url": string');
      return null;
    } */
  }
};