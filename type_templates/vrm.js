import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { VRMMaterialImporter } from '@pixiv/three-vrm/lib/three-vrm.module';
const { useApp, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer, useAvatarCruncher, useSettingsManager } = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
// const q180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const _fetchArrayBuffer = async srcUrl => {
  const res = await fetch(srcUrl);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer;
  } else {
    throw new Error('failed to load: ' + res.status + ' ' + srcUrl);
  }
};
/* const loadVrm = async (srcUrl) => {
  let vrmObject;
  try {
    const res = await fetch(srcUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      vrmObject = await parseVrm(arrayBuffer, srcUrl);
      vrmObject.arrayBuffer = arrayBuffer;
      // startMonetization(instanceId, monetizationPointer, ownerAddress);
    } else {
      throw new Error('failed to load: ' + res.status + ' ' + srcUrl);
    }
  } catch(err) {
    console.warn(err);
    vrmObject = null;
  }
  return vrmObject;
}; */
const parseVrm = (arrayBuffer, srcUrl) => new Promise((accept, reject) => {
  const { gltfLoader } = useLoaders();
  gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
});
/* const _findMaterialsObjects = (o, name) => {
  const result = [];
  o.traverse(o => {
    if (o.isMesh && o.material.name === name) {
      result.push(o);
    }
  });
  return result;
}; */
const _crunch = async o => {
  return useAvatarCruncher().crunchAvatarModel(o);
};
const mapTypes = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'map',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
];
const _addAnisotropy = (o, anisotropyLevel) => {
  o.traverse(o => {
    if (o.isMesh) {
      for (const mapType of mapTypes) {
        if (o.material[mapType]) {
          o.material[mapType].anisotropy = anisotropyLevel;
        }
      }
    }
  });
};

const _setQuality = (quality, app) => {
  
  switch (quality) {
    case 'LOW':
      console.log('not implimented');
      break;
    case 'MEDIUM': {
      app.setCurrentVrm('crunched');
      break;
    }
    case 'HIGH': {
      app.setCurrentVrm('base');
      break;
    }
    case 'ULTRA': {
      console.log('not implimented');
      break;
    }
    default: {
      throw new Error('unknown avatar quality: ' + quality);
    }
  }
  return app.getCurrentVrm().scene;
}

export default e => {
  const physics = usePhysics();

  const app = useApp();
  app.appType = 'vrm';
  app.current = 'base';

  let skinnedVrms = {};

  const srcUrl = ${ this.srcUrl };
  for (const { key, value } of components) {
    app.setComponent(key, value);
  }

  let arrayBuffer = null;
  const _cloneVrm = async () => {
    const vrm = await parseVrm(arrayBuffer, srcUrl);
    return vrm;
  };

  const _prepScene = (scene) => {
    scene.visible = false;
    app.add(scene);
    scene.updateMatrixWorld();
    _addAnisotropy(scene, 16);
  }



  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);

    skinnedVrms['base'] = await _cloneVrm();
    _prepScene(skinnedVrms.base.scene);

    //we always need the crunched avatar
    skinnedVrms['crunched'] = { ...skinnedVrms.base };
    skinnedVrms.crunched.scene = await _crunch(skinnedVrms.base.scene);
    _prepScene(skinnedVrms.crunched.scene)
    

    const _addPhysics = () => {
      const fakeHeight = 1.5;
      localMatrix.compose(
        localVector.set(0, fakeHeight / 2, 0),
        localQuaternion.identity(),
        localVector2.set(0.3, fakeHeight / 2, 0.3)
      )
        .premultiply(app.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);

      const physicsId = physics.addBoxGeometry(
        localVector,
        localQuaternion,
        localVector2,
        false
      );
      physicsIds.push(physicsId);
    };
    if (app.getComponent('physics')) {
      _addPhysics();
    }

    // we don't want to have per-frame bone updates for unworn avatars
    // so we toggle bone updates off and let the app enable them when worn
    app.toggleBoneUpdates(false);

    activateCb = async () => {
      const localPlayer = useLocalPlayer();
      localPlayer.setAvatarApp(app);
    };


    app.updateQuality();


  })());


  useActivate(() => {
    activateCb && activateCb();
  });

  app.lookAt = (lookAt => function (p) {
    lookAt.apply(this, arguments);
    this.quaternion.premultiply(q180);
  })(app.lookAt);

  app.getCurrentVrm = () => {
    return skinnedVrms[app.current];
  }

  // use this to change which vrm we're using
  app.setCurrentVrm = (newCurrent) => {
    for (const key in skinnedVrms) {
      if (Object.hasOwnProperty.call(skinnedVrms, key)) {
        skinnedVrms[key].scene.visible = false
      }
    }

    app.current = newCurrent;
    app.getCurrentVrm().scene.visible = true;
  }

  app.getCrunchedVrm = ()=>{
    return skinnedVrms.crunched;
  }

  app.setSkinning = async skinning => {
    console.warn("WARNING: setSkinning FUNCTION IS DEPRICATED and will be removed. Please use toggleBoneUpdates instead.");
    app.toggleBoneUpdates(skinning);
  }

  app.toggleBoneUpdates = update => {

    for (const key in skinnedVrms) {
      if (Object.hasOwnProperty.call(skinnedVrms, key)) {
        const _vrm = skinnedVrms[key];
        const { scene } = _vrm;
        scene.traverse(o => {
          // o.matrixAutoUpdate = update;
          if (o.isBone) o.matrixAutoUpdate = update;
        });
      }
    }

    if (update) {
      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);
      app.updateMatrixWorld();
    }

  }

  app.updateQuality = () => {
    const gfxSettings = useSettingsManager().getSettingsJson('GfxSettings');
    const quality = gfxSettings.character.details;
    return _setQuality(quality, app)
  }

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const components = ${ this.components };
