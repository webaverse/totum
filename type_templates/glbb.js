import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useLoaders, usePhysics, useCleanup} = metaversefile;

const size = 1024;
const worldSize = 2;

export default () => {
  const {shadertoyLoader} = useLoaders();
  
  const o = new THREE.Object3D();
  
  let _update = null;
  
  const srcUrl = '${this.srcUrl}';
  (async () => {
    const shadertoyRenderer = await shadertoyLoader.load(srcUrl, {
      size,
      worldSize,
    });
    await shadertoyRenderer.waitForLoad();
    o.add(shadertoyRenderer.mesh);
    _update = timeDiff => {
      shadertoyRenderer.update(timeDiff/1000);
    };
  })();
  
  let physicsIds = [];
  let staticPhysicsIds = [];
  const _run = () => {
    const physicsId = usePhysics().addBoxGeometry(
      o.position,        
      o.quaternion,
      new THREE.Vector3(worldSize/2, worldSize/2, 0.01),
      false
    );
    physicsIds.push(physicsId);
    staticPhysicsIds.push(physicsId);
  };
  _run();
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      usePhysics().removeGeometry(physicsId);
    }
    physicsIds.length = 0;
    staticPhysicsIds.length = 0;
  });

  useFrame(({timeDiff}) => {
    _update && _update(timeDiff);
  });

  return o;
};