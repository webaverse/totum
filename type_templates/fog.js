import * as THREE from 'three';
import totum from 'totum';
const {useApp, useInternals, useCleanup} = totum;

/* const flipGeomeryUvs = geometry => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
}; */
// console.log('got gif 0');

export default e => {
  const app = useApp();
  app.appType = 'fog';
  
  // const world = useWorld();
  
  // const {gifLoader} = useLoaders();
  // const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  // console.log('got light', {srcUrl});

  const {rootScene} = useInternals();

  // console.log('got fog src url', srcUrl, rootScene);

  let live = true;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    const fog = await res.json();
    // console.log('got fog', fog);
    if (!live) return;
    if (fog.fogType === 'linear') {
      const {args = []} = fog;
      rootScene.fog = new THREE.Fog(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1], args[2]);
    } else if (fog.fogType === 'exp') {
      const {args = []} = fog;
      // console.log('got fog args', {fog, args});
      rootScene.fog = new THREE.FogExp2(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1]);
    } else {
      console.warn('unknown fog type:', fog.fogType);
    }
  })();
  
  useCleanup(() => {
    live = false;
    rootScene.fog = null;
  });

  return app;
};
