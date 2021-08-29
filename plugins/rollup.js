const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

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

export default function metaversefilePlugin() {
  return {
    name: 'metaversefile',
    enforce: 'pre',
    resolveId(source, importer) {
      // console.log('resolveId', source);
      if (/^ipfs:\/+/.test(source)) {
        return source;
      } else {
        return null;
      }
    },
    load(id) {
      const match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(\?\.(.+))?$/i);
      // console.log('load', id, !!match);
      if (match) {
        return fetch(`https://ipfs.exokit.org/ipfs/${match[1]}${match[2]}`)
          .then(res => res.text());
      } else {
        return null;
      }
    },
    transform(src, id) {
      const match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(\?\.(.+))?$/i);
      // console.log('transform', id, match);
      if (match) {
        const type = match[3];
        const loader = loaders[type];
        if (loader) {
          return loader(src, id);
        }
      }
    }
  }
}