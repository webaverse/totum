const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
// const {resolveFileFromId, fetchFileFromId} = require('../util.js');

const loaders = (() => {
  const result = {};
  const dirname = path.join(__dirname, '..', 'types');
  const filenames = fs.readdirSync(dirname);
  for (const filename of filenames) {
    const match = filename.match(/^(.*)\.js$/);
    if (match) {
      const type = match[1];
      const p = path.join(dirname, filename);
      const module = require(p);
      result[type] = module;
    }
  }
  return result;
})();

const _getType = id => {
  let match;
  // console.log('transform', id, match);
  if (match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(?:\?\.([^\.]+))?$/i)) {
    return match[3];
  } else if (match = id.match(/(?:\.([^\.]+))$/)) {
    return match[1];
  } else {
    return null;
  }
};

module.exports = function metaversefilePlugin() {
  return {
    name: 'metaversefile',
    enforce: 'pre',
    async resolveId(source, importer) {
      const type = _getType(source);
      const loader = type && loaders[type];
      const resolveId = loader?.resolveId;
      if (resolveId) {
        return await resolveId(source, importer);
      } else {
        return null;
      }
    },
    async load(id) {
      const type = _getType(id);
      const loader = type && loaders[type];
      const load = loader?.load;
      if (load) {
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      }
      return null;
    },
    async transform(src, id) {
      const type = _getType(id);
      // console.log('get type', {id, type});
      const loader = type && loaders[type];
      const transform = loader?.transform;
      if (transform) {
        return await transform(src, id);
      }
      return null;
    }
  }
}