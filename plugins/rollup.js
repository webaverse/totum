const path = require('path');
const fs = require('fs');
const url = require('url');
const fetch = require('node-fetch');
// const {resolveFileFromId, fetchFileFromId} = require('../util.js');
const jsx = require('../types/jsx.js');
const metaversefile = require('../types/metaversefile.js');
const glb = require('../types/glb.js');
const vrm = require('../types/vrm.js');
const vox = require('../types/vox.js');
const image = require('../types/image.js');
const gif = require('../types/gif.js');
const glbb = require('../types/glbb.js');
const html = require('../types/html.js');
const directory = require('../types/.js');

const loaders = {
  js: jsx,
  jsx,
  metaversefile,
  glb,
  vrm,
  vox,
  png: image,
  jpg: image,
  gif,
  glbb,
  html,
  '': directory,
};

const dataUrlRegex = /^data:([^;,]+)(;(?:charset=utf-8|base64))?,([\s\S]*)$/;
const _getType = id => {
  let match;
  // console.log('transform', id, match);
  /* if (match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(?:\?\.([^\.]+))?$/i)) {
    return match[3] || '';
  } else { */
  
    const o = url.parse(id);
    /* if (/data:/.test(o.href)) {
      console.log('get type data url!!!', o);
    } */
    if (o.href && (match = o.href.match(dataUrlRegex))) {
      const type = match[1] || '';
      // console.log('data url get type!!!', type);
      switch (type) {
        case 'text/javascript':
          return 'js';
        default:
          return '';
      }
    } else if (o.hash && (match = o.hash.match(/^#type=(.+)$/))) {
      return match[1] || '';
    } else if (match = o.path.match(/\.([^\.\/]+)$/)) {
      return match[1] || '';
    } else {
      return '';
    }
  // }
};

module.exports = function metaversefilePlugin() {
  return {
    name: 'metaversefile',
    enforce: 'pre',
    async resolveId(source, importer) {
      // console.log('resolve id', source, importer);
      let replaced = false;
      if (/^\/@proxy\//.test(source)) {
        source = source
          .replace(/^\/@proxy\//, '')
          .replace(/^(https?:\/(?!\/))/, '$1/');
        replaced = true;
      }
      if (/^ipfs:\/\//.test(source)) {
        source = source.replace(/^ipfs:\/\/(?:ipfs\/)?/, 'https://cloudflare-ipfs.com/ipfs/');
        const res = await fetch(source, {
          method: 'HEAD',
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          const typeTag = (() => {
            switch (contentType) {
              case 'text/html':
                return 'html';
              default:
                return null;
            }
          })();
          if (typeTag) {
            source += `#type=${typeTag}`;
          } else {
            console.warn('unknown IPFS content type:', contentType);
          }
          // console.log('got content type', source, _getType(source));
        }
      }
      
      const type = _getType(source);
      const loader = loaders[type];
      const resolveId = loader?.resolveId;
      // console.log('get type', {source, type, loader: !!loader, resolveId: !!resolveId}, JSON.stringify(Object.keys(loaders)), loaders);
      if (resolveId) {
        const source2 = await resolveId(source, importer);
        // console.log('resolve rewrite', source, source2);
        return source2;
      } else {
        if (replaced) {
          // console.log('resolve replace', source);
          return source;
        } else {
          if (/^https?:\/\//.test(importer)) {
            o = url.parse(importer);
            if (/\/$/.test(o.pathname)) {
              o.pathname += '.fakeFile';
            }
            o.pathname = path.resolve(path.dirname(o.pathname), source);
            s = '/@proxy/' + url.format(o);
            // console.log('resolve format', s);
            return s;
          } else {
            // console.log('resolve null');
            return null;
          }
        }
      }
    },
    async load(id) {
      /* if (/data:/.test(id)) {
        console.log('load data id!!!', {id});
      } */
      const type = _getType(id);
      const loader = loaders[type];
      const load = loader?.load;
      if (load) {
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      }
      
      let match;
      if (/^https?:\/\//.test(id)) {
        const res = await fetch(id)
        const text = await res.text();
        return text;
      } else if (match = id.match(dataUrlRegex)) {
        const type = match[1];
        const encoding = match[2];
        const src = match[3];
        // console.log('load data url!!!', id, match);
        if (encoding === 'base64') {
          return atob(src);
        } else {
          return decodeURIComponent(src);
        }
      } else {
        return null;
      }
    },
    async transform(src, id) {
      const type = _getType(id);
      const loader = loaders[type];
      const transform = loader?.transform;
      if (transform) {
        return await transform(src, id);
      }
      return null;
    }
  }
}