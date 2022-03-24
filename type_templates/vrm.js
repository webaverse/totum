import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { VRMMaterialImporter } from '@pixiv/three-vrm/lib/three-vrm.module';
const { useApp, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer, useSettingsManager } = metaversefile;

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

const _setQuality = async (quality, app) => {
  const skinnedVrms = app.skinnedVrms;
  const baseVrm = skinnedVrms.base;

  switch (quality ?? 'MEDIUM') {
    case 'LOW':
    case 'MEDIUM': {
      if (skinnedVrms.crunched) {
        if (skinnedVrms.crunched.scene.name !== "crunched") {
          await skinnedVrms.crunched.makeCrunched(skinnedVrms.base);
        }
      } else {
        throw new Error('something went wrong, missing crunched avatar');
      }
      app.setActive('crunched');

      break;
    }
    case 'HIGH': {
      baseVrm.scene.name = "base mesh"
      app.setActive('base');
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
  return app.getActive();
}

export default e => {
  const physics = usePhysics();

  const app = useApp();
  app.appType = 'vrm';
  app.active = 'base';

  app.skinnedVrms = {};

  const srcUrl = ${ this.srcUrl };
  for (const { key, value } of components) {
    app.setComponent(key, value);
  }

  let arrayBuffer = null;
  const _cloneVrm = async () => {
    const vrm = await parseVrm(arrayBuffer, srcUrl);
    vrm.cloneVrm = _cloneVrm;
    return vrm;
  };

  const _prepVrm = (vrm) => {
    vrm.visible = false;
    app.add(vrm);
    vrm.updateMatrixWorld();
    _addAnisotropy(vrm, 16);
  }

  app.getActive = (_app = false) => {
    //return scene if we have an active vrm and we're not requesting the scene.  else return the(possibly) active vrm
    return app.skinnedVrms[app.active] && !_app ? app.skinnedVrms[app.active].scene : app.skinnedVrms[app.active];
  }

  // use this to change which mesh we're using
  app.setActive = (target) => {
    for (const key in app.skinnedVrms) {
      if (Object.hasOwnProperty.call(app.skinnedVrms, key)) {
        app.skinnedVrms[key].scene.visible = false
      }
    }

    app.active = target;
        !app.getActive().parent && _prepVrm(app.getActive());
    app.getActive().visible = true;
  }

  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);

    const skinnedVrmBase = await _cloneVrm();
    app.skinnedVrms['base'] = skinnedVrmBase;
    app.skinnedVrm = skinnedVrmBase; //temporary support for webaverse code base until it's updated
    _prepVrm(skinnedVrmBase.scene);
    app.skinnedVrms.base.scene.name = 'base mesh';

    app.skinnedVrms['base'].makeCrunched = async (src) => {
      if (src.scene.name == "crunched") return src.scene;
      //we always need the crunched avatar
      const skinnedVrmCrunched = await _crunch(src.scene);
      skinnedVrmCrunched.name = 'crunched';
      _prepVrm(skinnedVrmCrunched)
      let tmpVrms = { ...app.skinnedVrms };
      delete tmpVrms.crunched;
      tmpVrms.crunched = { ...src };
      tmpVrms.crunched.scene = skinnedVrmCrunched;
      app.skinnedVrms = tmpVrms;
      return skinnedVrmCrunched;
    }

    app.skinnedVrms['crunched'] = app.skinnedVrms['base'];    

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

    app.updateQuality = async () => {
      const gfxSettings = useSettingsManager().getSettingsJson('GfxSettings');
      const quality = gfxSettings.character.details;
      return await _setQuality(quality, app)
    }

    await app.updateQuality();


  })());


  useActivate(() => {
    activateCb && activateCb();
  });

  app.lookAt = (lookAt => function (p) {
    lookAt.apply(this, arguments);
    this.quaternion.premultiply(q180);
  })(app.lookAt);

  app.setSkinning = async skinning => {
    console.warn("WARNING: setSkinning FUNCTION IS DEPRICATED and will be removed. Please use toggleBoneUpdates instead.");
    app.toggleBoneUpdates(skinning);
  }

  app.toggleBoneUpdates = update => {

    const scene = app.skinnedVrm.scene;
    scene.traverse(o => {
      // o.matrixAutoUpdate = update;
      if (o.isBone) o.matrixAutoUpdate = update;
    });

    if (update) {
      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);
      app.updateMatrixWorld();
    }

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
