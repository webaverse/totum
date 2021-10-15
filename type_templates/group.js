import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useInternals} = metaversefile;

/* const flipGeomeryUvs = geometry => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
}; */
// console.log('got gif 0');

const localMatrix = new THREE.Matrix4();

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
  
  // console.log('group load', app, app.position.toArray());
  
  // const {gifLoader} = useLoaders();
  // const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  // console.log('got light', {srcUrl});
  
  const _updateSubAppMatrix = subApp => {
    localMatrix.copy(subApp.offsetMatrix);
    // localMatrix.decompose(subApp.position, subApp.quaternion, subApp.scale);
    if (subApps[0] && subApp !== subApps[0]) {
      localMatrix.premultiply(subApps[0].matrixWorld);
      // localMatrix.decompose(subApp.position, subApp.quaternion, subApp.scale);
    } else {
      // localMatrix.decompose(subApp.position, subApp.quaternion, subApp.scale);
      localMatrix.premultiply(app.matrixWorld);
    }
    localMatrix.decompose(subApp.position, subApp.quaternion, subApp.scale);
    // /light/.test(subApp.name) && console.log('update subapp', subApp.position.toArray().join(', '));
    subApp.updateMatrixWorld();
  };
  
  let live = true;
  let subApps = [];
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    subApps = Array(objects.length);
    for (let i = 0; i < subApps.length; i++) {
      subApps[i] = null;
    }
    // console.log('group objects 1', objects);
    const promises = objects.map(async (object, i) => {
      if (live) {
        let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
        position = new THREE.Vector3().fromArray(position);
        quaternion = new THREE.Quaternion().fromArray(quaternion);
        scale = new THREE.Vector3().fromArray(scale);

        let u2 = getObjectUrl(object);
        // console.log('add object', u2, {start_url, type, content});
        
        // console.log('group objects 2', u2);
        
        if (/^https?:/.test(u2)) {
          u2 = '/@proxy/' + u2;
        }
        const m = await metaversefile.import(u2);
        // console.log('group objects 3', u2, m);
        const subApp = metaversefile.createApp({
          name: u2,
        });
        subApp.offsetMatrix = new THREE.Matrix4().compose(position, quaternion, scale);
        // console.log('group objects 3', subApp);
        subApp.setComponent('physics', true);
        for (const {key, value} of components) {
          subApp.setComponent(key, value);
        }
        subApps[i] = subApp;
        _updateSubAppMatrix(subApp);
        await subApp.addModule(m);
        // console.log('group objects 4', subApp);
        metaversefile.addApp(subApp);

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
  })());
  
  useFrame(() => {
    for (const subApp of subApps) {
      subApp && _updateSubAppMatrix(subApp);
    }
  });
  
  useActivate(() => {
    for (const subApp of subApps) {
      subApp && subApp.activate();
    }
  });
  
  useCleanup(() => {
    live = false;
    for (const subApp of subApps) {
      if (subApp) {
        metaversefile.removeApp(subApp);
        subApp.destroy();
      }
    }
  });

  return app;
};