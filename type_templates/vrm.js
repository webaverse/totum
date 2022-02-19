import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { VRMMaterialImporter } from '@pixiv/three-vrm/lib/three-vrm.module';
const {useApp, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer, useAvatarSpriter, getQualitySetting, useAvatarCruncher} = metaversefile;

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
  const {gltfLoader} = useLoaders();
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
const _spritify = o => {
  return useAvatarSpriter().createSpriteMegaMesh(o);
};
const _crunch = async o => {
  return useAvatarCruncher().crunchAvatarModel(o);
};
const _toonShaderify = async o => {
  await new VRMMaterialImporter().convertGLTFMaterials(o);
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

const _setQuality = async (quality, skinnedVrms)=> {
  const baseVrm = skinnedVrms.base;
  switch (quality) {
    case 1: {
      const skinnedVrmSprite = await baseVrm.cloneVrm();
      skinnedVrmSprite.scenes[0] = _spritify(skinnedVrmSprite);
      skinnedVrmSprite.scene = skinnedVrmSprite.scenes[0];
 
      skinnedVrms['sprite'] = skinnedVrmSprite;
      skinnedVrms['active'] = skinnedVrmSprite;
  
      break;
    }
    case 2: {
      skinnedVrms['active'] = skinnedVrms['crunch'];
  
      break;
    }
    case 3: {
      skinnedVrms['active'] = skinnedVrms['base'];

      break;
    }
    case 4: {
      const skinnedVrmToon = await baseVrm.cloneVrm();
      await _toonShaderify(skinnedVrmToon);

      skinnedVrms['toon'] = skinnedVrmToon;
      skinnedVrms['active'] = skinnedVrmToon;

      break;
    }
    default: {
      throw new Error('unknown avatar quality: ' + quality);
    }
  }
}


export default e => {
  const physics = usePhysics();

  const app = useApp();
  app.appType = 'vrm';
  
  app.skinnedVrms = {};

  const srcUrl = '${this.srcUrl}';
  const components = (
    ${this.components}
  );
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }

  let arrayBuffer = null;
  const _cloneVrm = async () => {
    const vrm = await parseVrm(arrayBuffer, srcUrl);
    vrm.cloneVrm = _cloneVrm;
    vrm.toonShaderify = _toonShaderify;
    return vrm;
  };
  
  const _prepVrm = (vrm) => {
  
    vrm.visible = false;
    app.add(vrm);
    vrm.updateMatrixWorld();
    _addAnisotropy(vrm, 16);
  }

  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);
    const skinnedVrmBase = await _cloneVrm();
    app.skinnedVrms['base'] = skinnedVrmBase;
    _prepVrm(skinnedVrmBase.scene);

    app.skinnedVrms['crunch'] = app.skinnedVrms['base'];

    const qualityMap = {
      "ULTRA": 4,
      "HIGH": 3,
      "MEDIUM": 2,
      "LOW": 1
    }
    const quality = getQualitySetting();
    await _setQuality(qualityMap[quality], app.skinnedVrms)
    
    for (const type in app.skinnedVrms) {
      if (type !== 'active' && type !== 'base' && Object.hasOwnProperty.call(app.skinnedVrms, type)) {
        const vrm = app.skinnedVrms[type];
        vrm && _prepVrm(vrm.isMesh ? vrm : vrm.scene);
      }
    }

    const _addPhysics = () => {
      const fakeHeight = 1.5;
      localMatrix.compose(
        localVector.set(0, fakeHeight/2, 0),
        localQuaternion.identity(),
        localVector2.set(0.3, fakeHeight/2, 0.3)
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

    activateCb = async () => {
      const localPlayer = useLocalPlayer();
      localPlayer.setAvatarApp(app);
    };

    app.skinnedVrms['crunch'].makeCrunched = async (src) => {
      //we always need the crunched avatar
       
      const skinnedVrmCrunched = await _crunch(src.scene);
      app.skinnedVrms['crunch'].scene = skinnedVrmCrunched;
      _prepVrm(app.skinnedVrms['crunch'].scene)
      return app.skinnedVrms['crunch'];
    }

  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  app.lookAt = (lookAt => function(p) {
    lookAt.apply(this, arguments);
    this.quaternion.premultiply(q180);
  })(app.lookAt);

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};
