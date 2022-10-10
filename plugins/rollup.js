import path from 'path';
import url from 'url';
import mimeTypes from 'mime-types';
import {contractNames} from '../constants.js';

import cryptovoxels from '../contracts/cryptovoxels.js';
import moreloot from '../contracts/moreloot.js';
import loomlock from '../contracts/loomlock.js';

import jsx from '../types/jsx.js';
import metaversefile from '../types/metaversefile.js';
import glb from '../types/glb.js';
import vrm from '../types/vrm.js';
import vox from '../types/vox.js';
import image from '../types/image.js';
import gif from '../types/gif.js';
import glbb from '../types/glbb.js';
import gltj from '../types/gltj.js';
import html from '../types/html.js';
import scn from '../types/scn.js';
import light from '../types/light.js';
import text from '../types/text.js';
// import fog from '../types/fog.js';
// import background from '../types/background.js';
import rendersettings from '../types/rendersettings.js';
import spawnpoint from '../types/spawnpoint.js';
import wind from '../types/wind.js';
import lore from '../types/lore.js';
import quest from '../types/quest.js';
import npc from '../types/npc.js';
import mob from '../types/mob.js';
import react from '../types/react.js';
import group from '../types/group.js';
import vircadia from '../types/vircadia.js';
import directory from '../types/directory.js';

import upath from 'unix-path';

const contracts = {
  cryptovoxels,
  moreloot,
  loomlock,
};
const loaders = {
  js: jsx,
  jsx,
  metaversefile,
  glb,
  vrm,
  vox,
  png: image,
  jpg: image,
  jpeg: image,
  svg: image,
  gif,
  glbb,
  gltj,
  html,
  scn,
  light,
  text,
  // fog,
  // background,
  rendersettings,
  spawnpoint,
  lore,
  quest,
  npc,
  mob,
  react,
  group,
  wind,
  vircadia,
  '': directory,
};

const dataUrlRegex = /^data:([^;,]+)(?:;(charset=utf-8|base64))?,([\s\S]*)$/;
const _getType = id => {
  id = id.replace(/^\/@proxy\//, '');
  
  const o = url.parse(id, true);
  // console.log('get type', o, o.href.match(dataUrlRegex));
  let match;
  if (o.href && (match = o.href.match(dataUrlRegex))) {
    let type = match[1] || '';
    if (type === 'text/javascript') {
      type = 'application/javascript';
    }
    let extension;
    let match2;
    if (match2 = type.match(/^application\/(light|text|rendersettings|spawnpoint|lore|quest|npc|mob|react|group|wind|vircadia)$/)) {
      extension = match2[1];
    } else if (match2 = type.match(/^application\/(javascript)$/)) {
      extension = 'js';
    } else {
      extension = mimeTypes.extension(type);
    }
    // console.log('got data extension', {type, extension});
    return extension || '';
  } else if (o.hash && (match = o.hash.match(/^#type=(.+)$/))) {
    return match[1] || '';
  } else if (o.query && o.query.type) {
    return o.query.type;
  } else if (match = o.path.match(/\.([^\.\/]+)$/)) {
    return match[1].toLowerCase() || '';
  } else {
    return '';
  }
};

const _resolvePathName = (pathName , source) => {
  /**
   * This check is specifically added because of windows 
   * as windows is converting constantly all forward slashes into
   * backward slash
   */
  if(process.platform === 'win32'){
    pathName = pathName.replaceAll('\\','/').replaceAll('//','/');
    pathName = path.resolve(upath.parse(pathName).dir, source);
    /** 
     * Whenever path.resolve returns the result in windows it add the drive letter as well
     * Slice the drive letter (c:/, e:/, d:/ ) from the path and change backward slash 
     * back to forward slash.
     */
     pathName = pathName.slice(3).replaceAll('\\','/');
  }else{
    pathName = path.resolve(path.dirname(pathName), source);
  }
  return pathName;
}

const _resolveLoaderId = loaderId => {
  /**
   * This check is specifically added because of windows 
   * as windows is converting constantly all forward slashes into
   * backward slash
   */
  //console.log(loaderId);
  // const cwd = process.cwd();
  if(process.platform === 'win32'){
    //if(loaderId.startsWith(cwd) || loaderId.replaceAll('/','\\').startsWith(cwd)){
    //  loaderId = loaderId.slice(cwd.length);
    //}else if(loaderId.startsWith('http') || loaderId.startsWith('https')){
    //  loaderId = loaderId.replaceAll('\\','/');
    //}
    loaderId = loaderId.replaceAll('\\','/');

    // if(loaderId.startsWith('http') || loaderId.startsWith('https')){
    //   loaderId = loaderId.replaceAll('\\','/');
    // }
  }
  return loaderId;
}

export default function metaversefilePlugin() {
  return {
    name: 'metaversefile',
    enforce: 'pre',
    async resolveId(source, importer) {
      // do not resolve node module subpaths
      if (/^((?:@[^\/]+\/)?[^\/:\.][^\/:]*)(\/[\s\S]*)$/.test(source)) {
        return null;
      }

      // scripts/compile.js: handle local compile case
      if (/^\.\//.test(source) && importer === '') {
        source = source.slice(1);
      }

      // console.log('rollup resolve id', {source, importer});
      let replacedProxy = false;
      if (/^\/@proxy\//.test(source)) {
        source = source
          .replace(/^\/@proxy\//, '')
          .replace(/^(https?:\/(?!\/))/, '$1/');
        replacedProxy = true;
      }
      if (/^ipfs:\/\//.test(source)) {
        source = source.replace(/^ipfs:\/\/(?:ipfs\/)?/, 'https://cloudflare-ipfs.com/ipfs/');
        
        const o = url.parse(source, true);
        if (!o.query.type) {
          const res = await fetch(source, {
            method: 'HEAD',
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            const typeTag = mimeTypes.extension(contentType);
            if (typeTag) {
              source += `#type=${typeTag}`;
            } else {
              console.warn('unknown IPFS content type:', contentType);
            }
            // console.log('got content type', source, _getType(source));
          }
        }
      }

      let match;
      if (match = source.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/)) {
        const address = match[1];
        const contractName = contractNames[address];
        const contract = contracts[contractName];
        const resolveId = contract?.resolveId;
        // console.log('check contract', resolveId);
        if (resolveId) {
          const source2 = await resolveId(source, importer);
          return source2;
        }
      }
      /* if (/^weba:\/\//.test(source)) {
        const {resolveId} = protocols.weba;
        const source2 = await resolveId(source, importer);
        return source2;
      } */
      
      const type = _getType(source);
      const loader = loaders[type];
      const resolveId = loader?.resolveId;
      if (resolveId) {
        const source2 = await resolveId(source, importer);
        // console.log('resolve rewrite', {type, source, source2});
        if (source2 !== undefined) {
          return source2;
        }
      }
      if (replacedProxy) {
        // console.log('resolve replace', source);
        return source;
      } else {
        if (/^https?:\/\//.test(importer)) {
          const o = url.parse(importer);
          if (/\/$/.test(o.pathname)) {
            o.pathname += '.fakeFile';
          }
          o.pathname = _resolvePathName(o.pathname,source);
          const s = '/@proxy/' + url.format(o);
          // console.log('resolve format', s);
          return s;
        } else {
          // console.log('resolve null');
          return null;
        }
      }
    },
    async load(id) {
      id = id
        // .replace(/^\/@proxy\//, '')
        .replace(/^(eth:\/(?!\/))/, '$1/')
        // .replace(/^(weba:\/(?!\/))/, '$1/');
      
      let match;
      // console.log('contract load match', id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/));
      if (match = id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/)) {
        const address = match[1];
        const contractName = contractNames[address];
        const contract = contracts[contractName];
        const load = contract?.load;
        // console.log('load contract 1', load);
        if (load) {
          const src = await load(id);
          
          // console.log('load contract 2', src);
          if (src !== null && src !== undefined) {
            return src;
          }
        }
      }
      /* if (/^weba:\/\//.test(id)) {
        const {load} = protocols.weba;
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      } */
      
      // console.log('load 2');
      
      const type = _getType(id);
      const loader = loaders[type];
      const load = loader?.load;

      if (load) {
        id = _resolveLoaderId(id);
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      }
      
      // console.log('load 2', {id, type, loader: !!loader, load: !!load});
      
      if (/^https?:\/\//.test(id)) {
        const res = await fetch(id)
        const text = await res.text();
        return text;
      } else if (match = id.match(dataUrlRegex)) {
        // console.log('load 3', match);
        // const type = match[1];
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
    },
  };
}