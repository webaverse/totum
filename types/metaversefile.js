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
    // console.log('metaversefile fetch', {id, importer, s});
    if (s !== null) {
      const {result, error} = _jsonParse(s);
      if (!error) {
        // console.log('load metaversefile', {s, result});
        const {start_url, components} = result;
        if (start_url) {
          if (/^https?:\/\//.test(start_url)) {
            // const o = url.parse(start_url, true);
            // console.log('new metaversefile id 1', {id, importer, start_url, o}, [path.dirname(o.pathname), start_url]);
            // o.pathname = path.join(path.dirname(o.pathname), start_url);
            /* if (Array.isArray(components)) {
              o.query.components = encodeURIComponent(JSON.stringify(components));
            } */
            const o = url.parse(start_url, true);
            o.pathname = '/@proxy/' + o.pathname;
            if (Array.isArray(components)) {
              o.hash = '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            let s = url.format(o);
            // console.log('new metaversefile id 1', {id, importer, result, start_url, s});
            return s;
          } else if (/^https?:\/\//.test(id)) {
            const o = url.parse(id, true);
            // console.log('new metaversefile id 1', {id, importer, start_url, o}, [path.dirname(o.pathname), start_url]);
            o.pathname = path.join(path.dirname(o.pathname), start_url);
            if (Array.isArray(components)) {
              o.hash = '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            /* if (Array.isArray(components)) {
              o.query.components = encodeURIComponent(JSON.stringify(components));
            } */
            let s = url.format(o);
            // console.log('new metaversefile id 2', {id, importer, result, start_url, s});
            return s;
          } else if (/^\//.test(id)) {
            if (id.startsWith(cwd)) {
              id = id.slice(cwd.length);
            }
            
            const o = url.parse(id, true);
            // console.log('new metaversefile id 3', {id, importer, start_url, o}, [path.dirname(o.pathname), start_url]);
            o.pathname = path.join(path.dirname(o.pathname), start_url);
            /* if (Array.isArray(components)) {
              o.query.components = encodeURIComponent(JSON.stringify(components));
            } */
            let s = url.format(o);
            if (/^\//.test(s)) {
              s = cwd + s;
            }
            if (Array.isArray(components)) {
              s += '#components=' + encodeURIComponent(JSON.stringify(components));
            }
            // console.log('new metaversefile id   4', {id, importer, start_url, o, s}, [path.dirname(o.pathname), start_url]);
            return s;
          } else {
            console.warn('.metaversefile scheme unknown');
            return null;
          }
        } else {
          console.warn('.metaversefile has no "start_url": string', {j, id, s});
          return null;
        }
      } else {
        console.warn('.metaversefile could not be parsed: ' + error.stack);
        return null;
      }
    } else {
      console.warn('.metaversefile could not be loaded');
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