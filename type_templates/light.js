import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, usePhysics} = metaversefile;

/* const flipGeomeryUvs = geometry => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
}; */
// console.log('got gif 0');

export default e => {
  const app = useApp();
  
  // const {gifLoader} = useLoaders();
  // const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  console.log('got light', {srcUrl});
  
  (async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    let {lightType, args, position} = j;
    const light = (() => {
      switch (lightType) {
        case 'ambient': {
          return new THREE.AmbientLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255),
            args[1]
          );
        }
        case 'directional': {
          return new THREE.AmbientLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255),
            args[1]
          );
        }
        default: {
          return null;
        }
      }
    })();
    if (light) {
      if (Array.isArray(position) && position.length === 3 && position.every(n => typeof n === 'number')) {
        light.position.fromArray(position);
      }
      app.add(light);
    } else {
      console.warn('invalid light spec:', j);
    }
  })();

  return app;
};