import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, usePhysics, useWorld} = metaversefile;

/* const flipGeomeryUvs = geometry => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
}; */
// console.log('got gif 0');

export default e => {
  const app = useApp();
  const world = useWorld();
  
  // const {gifLoader} = useLoaders();
  // const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  // console.log('got light', {srcUrl});
  
  const lights = [];
  (async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    let {lightType, args, position} = j;
    const light = (() => {
      switch (lightType) {
        case 'ambient': {
          return new THREE.AmbientLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            args[1]
          );
        }
        case 'directional': {
          return new THREE.DirectionalLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            args[1]
          );
        }
        case 'point': {
          return new THREE.PointLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            args[1],
            args[2],
            args[3]
          );
        }
        case 'spot': {
          return new THREE.SpotLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            args[1],
            args[2],
            args[3],
            args[4],
            args[5]
          );
        }
        case 'rectArea': {
          return new THREE.RectAreaLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            args[1],
            args[2],
            args[3]
          );
        }
        case 'hemisphere': {
          return new THREE.HemisphereLight(
            new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
            new THREE.Color().fromArray(args[1]).multiplyScalar(1/255).getHex(),
            args[2]
          );
        }
        default: {
          return null;
        }
      }
    })();
    if (light) {
      const p = (Array.isArray(position) && position.length === 3 && position.every(n => typeof n === 'number')) ?
        new THREE.Vector3().fromArray(position)
      :
        new THREE.Vector3();
      light.offsetMatrix = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
      light.lastAppMatrixWorld = new THREE.Matrix4();

      const worldLights = world.getLights();
      worldLights.add(light);
      
      lights.push(light);
    } else {
      console.warn('invalid light spec:', j);
    }
  })();
  
  useFrame(() => {
    for (const light of lights) {
      if (!light.lastAppMatrixWorld.equals(app.matrixWorld)) {
        light.position.copy(app.position);
        light.quaternion.copy(app.quaternion);
        light.scale.copy(app.scale);
        light.matrix.copy(app.matrix);
        light.matrixWorld.copy(app.matrixWorld);
        light.lastAppMatrixWorld.copy(app.matrixWorld);
      }
    }
  });
  
  useCleanup(() => {
    const worldLights = world.getLights();
    for (const light of lights) {
      worldLights.remove(light);
    }
    lights.length = 0;
  });

  return app;
};