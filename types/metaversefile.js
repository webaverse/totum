const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

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
    // console.log('check', id, importer);
    id = id.replace(/^[\/\\]+/, '');
    const s = await (async () => {
      let match;
      // console.log('load', id, match);
      if (match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(\?\.(.+))?$/i)) {
        const res = await fetch(`https://ipfs.exokit.org/ipfs/${match[1]}${match[2]}`)
        return await res.text();
      } else {
        return await new Promise((accept, reject) => {
          const p = path.resolve(path.dirname(importer), id);
          // console.log('got p', id, importer, p);
          fs.readFile(p, 'utf8', (err, s) => {
            if (!err) {
              accept(s);
            } else {
              if (err.code === 'ENOENT') {
                accept(null);
              } else {
                reject(err);
              }
            }
          });
        });
      }
    })();
    if (s !== null) {
      const j = _jsonParse(s);
      const start_url = j?.start_url;
      if (start_url) {
        const newId = path.resolve(path.dirname(importer), path.dirname(id), start_url);
        // console.log('reading file', {id, importer, start_url, newId});
        return newId;
      } else {
        console.warn('.metaversefile has no "start_url": string');
        return null;
      }
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