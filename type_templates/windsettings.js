import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useWorld} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

export default e => {
  const app = useApp();
  app.appType = 'wind';
  
  // const {gifLoader} = useLoaders();
  const world = useWorld();

  const srcUrl = '${this.srcUrl}';

  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    let {forceFactor, direction, refreshDelay} = j;

    const windParameters = world.getWindParameters();
    windParameters.forceFactor = forceFactor;
    windParameters.refreshDelay = refreshDelay;
    windParameters.direction = new THREE.Vector3();
    windParameters.direction.fromArray(direction);

  })());
  
  useFrame(() => {

  });
  
  useCleanup(() => {
    
    const windParameters = world.getWindParameters();

    windParameters.forceFactor = 0;
    windParameters.refreshDelay = 10000.0; //10s
    windParameters.direction.set(0,0,0);

  });

  return app;
};
