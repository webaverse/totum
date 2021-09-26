import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, usePhysics, useCleanup} = metaversefile;

const size = 1024;
const worldSize = 2;

export default () => {
  const app = useApp();
  const physics = usePhysics();
  
  const o = new THREE.Object3D();
  app.add(o);
  
  let _update = null;
  
  const srcUrl = '${this.srcUrl}';
  (async () => {
    const {shadertoyLoader} = useLoaders();
    const shadertoyRenderer = await shadertoyLoader.load(srcUrl, {
      size,
      worldSize,
    });
    // await shadertoyRenderer.waitForLoad();
    o.add(shadertoyRenderer.mesh);
    _update = timeDiff => {
      shadertoyRenderer.update(timeDiff/1000);
    };
  })();
  
  let physicsIds = [];
  let staticPhysicsIds = [];
  const _run = () => {
    const physicsId = physics.addBoxGeometry(
      o.position,        
      o.quaternion,
      new THREE.Vector3(app.scale.x * worldSize/2, app.scale.y * worldSize/2, app.scale.z * 0.01),
      false
    );
    physicsIds.push(physicsId);
    staticPhysicsIds.push(physicsId);
  };
  _run();
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
    staticPhysicsIds.length = 0;
  });

  useFrame(({timeDiff}) => {
    _update && _update(timeDiff);
  });

  return app;
};