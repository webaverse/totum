import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, addTrackedApp, removeTrackedApp, useCleanup} = metaversefile;

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
  
  const srcUrl = '${this.srcUrl}';
  
  let live = true;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    const promises = objects.map(async object => {
      if (live) {
        let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
        position = new THREE.Vector3().fromArray(position);
        quaternion = new THREE.Quaternion().fromArray(quaternion);
        scale = new THREE.Vector3().fromArray(scale);
        
        const u2 = getObjectUrl(object);
        await addTrackedApp(u2, position, quaternion, scale, components);

        /* let {start_url, position, quaternion, scale, physics, physics_url, autoScale, autoRun, dynamic} = object;
        if (position) {
          position = new THREE.Vector3().fromArray(position);
        }
        if (quaternion) {
          quaternion = new THREE.Quaternion().fromArray(quaternion);
        }
        if (scale) {
          scale = new THREE.Vector3().fromArray(scale);
        }
        const o = await addTrackedApp(start_url, null, position, quaternion, scale, {
          physics,
          physics_url,
          autoScale,
        }); */
        /* if (autoRun && o.useAux) {
          o.useAux(rigManager.localRig.aux);
        } */
      }
    });
    await Promise.all(promises);
  })());
  
  useCleanup(() => {
    live = false;
  });

  return true;
};