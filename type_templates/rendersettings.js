import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useInternals, useCleanup} = metaversefile;

const testSpec = {
  "background": {
    "color": [0, 0, 0]
  },
  "fog": {
    "fogType": "exp",
    "args": [[255, 255, 255], 0.01]
  },
  "ssao": {
    "kernelRadius": 16,
    "minDistance": 0.005,
    "maxDistance": 0.1
  },
  "dof": {
    "focus": 3.0,
    "aperture": 0.00002,
    "maxblur": 0.005
  },
  "hdr": {
    "adaptive": true,
    "resolution": 256,
    "adaptionRate": 100,
    "maxLuminance": 10,
    "minLuminance": 0,
    "middleGrey": 3
  },
  "bloom": {
    "strength": 0.2,
    "radius": 0.5,
    "threshold": 0.8
  }
};

export default e => {
  const app = useApp();
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
    const j = await res.json();
    console.log('got rendersettings', j);
    if (!live) return;
    if (j) {
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
    }
  })();
  
  useCleanup(() => {
    live = false;
    rootScene.fog = null;
  });

  return app;
};