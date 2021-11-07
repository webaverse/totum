import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useInternals, usePostProcessing, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  app.appType = 'rendersettings';
  
  // const world = useWorld();
  const postProcessing = usePostProcessing();
  
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
    const j = await res.json();
    // console.log('got rendersettings', j);
    if (!live) return;
    if (j) {
      const {background} = j;
      if (background) {
        let {color} = background;
        if (Array.isArray(color) && color.length === 3 && color.every(n => typeof n === 'number')) {
          rootScene.background = new THREE.Color(color[0]/255, color[1]/255, color[2]/255);
        }
      }
      
      const {fog} = j;
      if (fog) {
        if (fog.fogType === 'linear') {
          const {args = []} = fog;
          rootScene.fog = new THREE.Fog(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1], args[2]);
        } else if (fog.fogType === 'exp') {
          const {args = []} = fog;
          rootScene.fog = new THREE.FogExp2(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1]);
        } else {
          console.warn('unknown fog type:', fog.fogType);
        }
      }
      
      postProcessing.setPasses(j);
    }
  })();
  
  useCleanup(() => {
    live = false;
    rootScene.fog = null;
    rootScene.background = null;

    postProcessing.setPasses(null);
  });

  return app;
};