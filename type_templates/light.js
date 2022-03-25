import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLocalPlayer, useCleanup, /*usePhysics, */ useWorld} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

export default e => {
  const app = useApp();
  // const world = useWorld();
  const worldLights = app;

  app.appType = 'light';
  app.light = null;

  const srcUrl = ${this.srcUrl};

  /* const _isRenderable = () => {
    const paused = app.getComponent('paused') ?? false;
    const rendering = app.getComponent('rendering') ?? false;
    return !paused || rendering;
  }; */
  
  const addShadows = (light, params) => {
    light.castShadow = true; 
    if (typeof params[1] === 'number') {
      light.shadow.mapSize.width = params[1]; 
      light.shadow.mapSize.height = params[1]; 
    }
    if (typeof params[2] === 'number') {
      light.shadow.camera.near = params[2];
    }
    if (typeof params[3] === 'number') {
      light.shadow.camera.far = params[3];
    }
    if (typeof params[0] === 'number') {
      light.shadow.camera.left = params[0];
      light.shadow.camera.right = -params[0];
      light.shadow.camera.top = params[0];
      light.shadow.camera.bottom = -params[0];
    }
    if (typeof params[4] === 'number') {
      light.shadow.bias = params[4];
    }
    if (typeof params[5] === 'number') {
      light.shadow.normalBias = params[5];
    }
    
    light.shadow.camera.initialLeft = light.shadow.camera.left;
    light.shadow.camera.initialRight = light.shadow.camera.right;
    light.shadow.camera.initialTop = light.shadow.camera.top;
    light.shadow.camera.initialBottom = light.shadow.camera.bottom;
    
    // light.params = params;
    // console.log("Added shadows for:", light, "with params:", params);
  };

  let json = null;
  // let bound = false;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    json = await res.json();

    _render();
    /* if (_isRenderable()) {
      _bind();
    } */
  })());
  
  /* const _bind = () => {
    if (!bound) {
      _render();

      bound = true;
    }
  };
  const _unbind = () => {
    if (bound) {
      for (const lightTracker of lightTrackers) {
        worldLights.remove(lightTracker);
      }
      lightTrackers.length = 0;
      
      for (const lightTarget of lightTargets) {
        worldLights.remove(lightTarget);
      }
      lightTargets.length = 0;

      bound = false;
    }
  }; */

  const lightTrackers = [];
  const lightTargets = [];
  const _render = () => {
    if (json !== null) {
      let {lightType, args, position, shadow} = json;
      const light = (() => {
        switch (lightType) {
          case 'ambient': {
            return new THREE.AmbientLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1]
            );
          }
          case 'directional': {
            return new THREE.DirectionalLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1]
            );
          }
          case 'point': {
            return new THREE.PointLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3]
            );
          }
          case 'spot': {
            return new THREE.SpotLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3],
              args[4],
              args[5]
            );
          }
          case 'rectArea': {
            return new THREE.RectAreaLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3]
            );
          }
          case 'hemisphere': {
            return new THREE.HemisphereLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              new THREE.Color().fromArray(args[1]).multiplyScalar(1/255).getHex(),
              args[2]
            );
          }
          default: {
            return null;
          }
        }
      })();
      if (light) {
        /* const p = (Array.isArray(position) && position.length === 3 && position.every(n => typeof n === 'number')) ?
          new THREE.Vector3().fromArray(position)
        :
          new THREE.Vector3();
        light.offsetMatrix = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z); */
        light.lastAppMatrixWorld = new THREE.Matrix4();
        light.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, -1, 0), app.position);

        if (lightType === 'directional' || lightType === 'point' || lightType === 'spot') {
          if (Array.isArray(shadow)) {
            addShadows(light, shadow);
          } /* else {
            console.log('Error in shadow params or no active shadows');
          } */
        }
        
        const lightTracker = new THREE.Object3D();
        lightTracker.name = 'LightTracker';
        if (Array.isArray(position)) {
          lightTracker.position.fromArray(position);
        } else {
          lightTracker.position.set(0, 0, 0);
        }
        light.position.set(0, 0, 0);
        lightTracker.add(light);
        lightTracker.light = light;
        
        worldLights.add(lightTracker);
        lightTrackers.push(lightTracker)
        if (light.target) {
          worldLights.add(light.target);
          lightTargets.push(light.target);
        }
        lightTracker.updateMatrixWorld(true);
        
        app.light = lightTracker;
      } else {
        console.warn('invalid light spec:', j);
      }
    }
  };

  useFrame(() => {
    if (lightTrackers.length > 0) {
      for (const lightTracker of lightTrackers) {
        const {light} = lightTracker;
        if (!light.lastAppMatrixWorld.equals(app.matrixWorld)) {
          light.position.copy(app.position);
          // light.quaternion.copy(app.quaternion);
          if (light.target) {
            light.quaternion.setFromRotationMatrix(
              new THREE.Matrix4().lookAt(
                light.position,
                light.target.position,
                localVector.set(0, 1, 0),
              )
            );
          }
          light.scale.copy(app.scale);
          light.matrix.copy(app.matrix);
          light.matrixWorld.copy(app.matrixWorld);
          light.lastAppMatrixWorld.copy(app.matrixWorld);
          light.updateMatrixWorld();
        }
      }

      const localPlayer = useLocalPlayer();
      for (const lightTracker of lightTrackers) {
        const {light} = lightTracker;
        if (light.isDirectionalLight) {
          light.plane.setFromNormalAndCoplanarPoint(localVector.set(0, 0, -1).applyQuaternion(light.shadow.camera.quaternion), light.shadow.camera.position);
          const planeTarget = light.plane.projectPoint(localPlayer.position, localVector);
          // light.updateMatrixWorld();
          const planeCenter = light.shadow.camera.position.clone();
          
          const x = planeTarget.clone().sub(planeCenter)
            .dot(localVector2.set(1, 0, 0).applyQuaternion(light.shadow.camera.quaternion));
          const y = planeTarget.clone().sub(planeCenter)
            .dot(localVector2.set(0, 1, 0).applyQuaternion(light.shadow.camera.quaternion));
          
          light.shadow.camera.left = x + light.shadow.camera.initialLeft;
          light.shadow.camera.right = x + light.shadow.camera.initialRight;
          light.shadow.camera.top = y + light.shadow.camera.initialTop;
          light.shadow.camera.bottom = y + light.shadow.camera.initialBottom;
          light.shadow.camera.updateProjectionMatrix();
          light.updateMatrixWorld();
        }
      }
    }
  });
  useCleanup(() => {
    for (const lightTracker of lightTrackers) {
      worldLights.remove(lightTracker);
    }
    lightTrackers.length = 0;
    
    for (const lightTarget of lightTargets) {
      worldLights.remove(lightTarget);
    }
    lightTargets.length = 0;
  });

  /* if (!paused) {
    _bind();
  } */
  /* app.addEventListener('componentsupdate', e => {
    const {keys} = e;
    if (keys.includes('paused') || keys.includes('rendering')) {
      const renderable = _isRenderable();
      if (renderable) {
        _bind();
      } else {
        _unbind();
      }
    }
  }); */

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};