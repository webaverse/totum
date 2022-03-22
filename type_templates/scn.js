import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, createApp, addTrackedApp, removeTrackedApp, useCleanup} = metaversefile;

function getObjectUrl(object) {
  let {start_url, type, content} = object;
  
  let u;
  if (start_url) {
    // make path relative to the .scn file
    u = /^\\.\\//.test(start_url) ? (new URL(import.meta.url).pathname.replace(/(\\/)[^\\/]*$/, '$1') + start_url.replace(/^\\.\\//, '')) : start_url;
  } else if (type && content) {
    if (typeof content === 'object') {
      content = JSON.stringify(content);
    }
    u = '/@proxy/data:' + type + ',' + encodeURI(content);
  } else {
    throw new Error('invalid scene object: ' + JSON.stringify(object));
  }
  return u;
}

export default e => {
  const app = useApp();
  app.appType = 'scn';
  
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  const loadApp = (() => {
    switch (mode) {
      case 'detached': {
        return async (url, position, quaternion, scale, components) => {
          const components2 = {};
          for (const {key, value} of components) {
            components2[key] = value;
          }
          if (components2.mode === undefined) {
            components2.mode = 'detached';
          }
          
          const subApp = await createAppAsync({
            start_url: url,
            position,
            quaternion,
            scale,
            components: components2,
          });
          subApp.updateMatrixWorld();
        };
      }
      case 'attached': {
        return async (url, position, quaternion, scale, components) => {
          await addTrackedApp(url, position, quaternion, scale, components);
        };
      }
      default: {
        throw new Error('unknown mode: ' + mode);
      }
    }
  })();
  
  let live = true;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    const buckets = {};

    for (const object of objects) {
      const lp = object.loadPriority ?? 0;
      let a = buckets[lp];
      if (!a) {
        a = [];
        buckets[lp] = a;
      }
      a.push(object);
    }

    const sKeys = Object.keys(buckets).sort((a, b) => a - b);
    
    for (let i=0; i<sKeys.length; i++) {
      const lp = sKeys[i];
      await Promise.all(buckets[lp].map(async object=>{
        if (live) {
          let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
          position = new THREE.Vector3().fromArray(position);
          quaternion = new THREE.Quaternion().fromArray(quaternion);
          scale = new THREE.Vector3().fromArray(scale);
          
          const u2 = getObjectUrl(object);
          await loadApp(u2, position, quaternion, scale, components);
        }
      }));
    }
  })());
  
  useCleanup(() => {
    live = false;
  });

  return true;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};