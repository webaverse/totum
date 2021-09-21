import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useWorld, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const world = useWorld();
  
  const srcUrl = '${this.srcUrl}';
  
  let live = true;
  app.addEventListener('destroy', () => {
    debugger;
    live = false;
  });

  (async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    const promises = objects.map(async object => {
      if (live) {
        let {start_url, position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1]} = object;
        position = new THREE.Vector3().fromArray(position);
        quaternion = new THREE.Quaternion().fromArray(quaternion);
        scale = new THREE.Vector3().fromArray(scale);
        
        // make path relative to the .scn file
        const u2 = /^\\.\\//.test(start_url) ? (new URL(import.meta.url).pathname.replace(/(\\/)[^\\/]*$/, '$1') + start_url.replace(/^\\.\\//, '')) : start_url;
        world.addObject(u2, position, quaternion, scale);

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
        const o = await world.addObject(start_url, null, position, quaternion, scale, {
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
  })();

  return true;
};