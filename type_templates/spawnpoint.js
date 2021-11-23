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

      console.log(camera);

      if (j.position) {
        localPlayer.position.set(j.position[0], j.position[1], j.position[2]);
      }
      if (j.quaternion) {
        localPlayer.quaternion.set(j.quaternion[0], j.quaternion[1], j.quaternion[2], j.quaternion[3]);
        camera.quaternion.set(j.quaternion[0], j.quaternion[1], j.quaternion[2], j.quaternion[3]);
      }
    }
  })();
  
  useCleanup(() => {
  });

  return app;
};