import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useInternals, useCleanup, useLocalPlayer} = metaversefile;

export default e => {
  const app = useApp();
  app.appType = 'spawnpoint';
  
  const srcUrl = '${this.srcUrl}';

  (async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    if (j) {
      
      const localPlayer = useLocalPlayer();
      const {camera} = useInternals();

      if (j.position) {
        localPlayer.position.fromArray(j.position);
        localPlayer.updateMatrix();
        localPlayer.updateMatrixWorld();
      }
      if (j.quaternion) {
        localPlayer.quaternion.fromArray(j.quaternion);
        localPlayer.updateMatrix();
        localPlayer.updateMatrixWorld();
        camera.quaternion.fromArray(j.quaternion);
        camera.updateMatrix();
        camera.updateMatrixWorld();
      }
    }
  })();
  
  useCleanup(() => {
  });

  return app;
};
