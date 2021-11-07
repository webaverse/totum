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

export default e => {
  const app = useApp();
  app.appType = 'background';
  
  const {scene} = useInternals();
  
  // const {gifLoader} = useLoaders();
  // const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  // console.log('got light', {srcUrl});
  
  let live = true;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    const j = await res.json();
    if (!live) return;
    let {color} = j;
    if (Array.isArray(color) && color.length === 3 && color.every(n => typeof n === 'number')) {
      scene.background = new THREE.Color(color[0]/255, color[1]/255, color[2]/255);
    }
  })();
  
  useCleanup(() => {
    live = false;
    scene.background = null;
  });

  return app;
};