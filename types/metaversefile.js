const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const {fetchFileFromId} = require('../util.js');

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
    // console.log('metaversefile fetch', {id, importer, s});
    if (s !== null) {
      const j = _jsonParse(s);
      const start_url = j?.start_url;
      if (start_url) {
        const newId = path.resolve(path.dirname(importer), path.dirname(id.replace(/^[\/\\]+/, '')), start_url);
        // console.log('new id', {id, importer, newId, start_url});
        return newId;
      } else {
        console.warn('.metaversefile has no "start_url": string');
        return null;
      }
    } else {
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