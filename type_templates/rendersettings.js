import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useInternals, usePostProcessing, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const postProcessing = usePostProcessing();
  const {rootScene} = useInternals();

  app.appType = 'rendersettings';

  const srcUrl = ${this.srcUrl};
  const paused = app.getComponent('paused') ?? false;

  let live = true;
  let json = null;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    json = await res.json();
    if (!live) return;

    const paused = app.getComponent('paused') ?? false;
    if (!paused) {
      _bind();
    }
  })();

  let bound = false;
  const _bind = () => {
    if (!bound) {
      const {background} = json;
      if (background) {
        let {color} = background;
        if (Array.isArray(color) && color.length === 3 && color.every(n => typeof n === 'number')) {
          rootScene.background = new THREE.Color(color[0]/255, color[1]/255, color[2]/255);
        }
      }
      
      const {fog} = json;
      if (fog) {
        if (fog.fogType === 'linear') {
          const {args = []} = fog;
          rootScene.fog = new THREE.Fog(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1], args[2]);
        } else if (fog.fogType === 'exp') {
          const {args = []} = fog;
          rootScene.fog = new THREE.FogExp2(new THREE.Color(args[0][0]/255, args[0][1]/255, args[0][2]/255).getHex(), args[1]);
        } else {
          console.warn('unknown rendersettings fog type:', fog.fogType);
        }
      }
      
      postProcessing.setPasses(j);
    
      bound = true;
    }
  };
  const _unbind = () => {
    if (bound) {
      rootScene.fog = null;
      rootScene.background = null;

      postProcessing.setPasses(null);
    
      bound = false;
    }
  };
  
  useCleanup(() => {
    live = false;
    _unbind();
  });

  /* if (!paused) {
    _bind();
  } */
  app.addEventListener('componentsupdate', e => {
    const {keys} = e;
    if (keys.includes('paused')) {
      const paused = app.getComponent('paused') ?? false;
      if (paused) {
        _unbind();
      } else {
        _bind();
      }
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};