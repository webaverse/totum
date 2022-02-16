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
  // o.spriteMegaAvatarMesh = useAvatarSpriter().createSpriteMegaMesh(await o.cloneVrm());
};
const _crunch = o => {
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
      _spritify(skinnedVrmSprite);
  
      skinnedVrms['sprite'] = skinnedVrmSprite;
      skinnedVrms['active'] = skinnedVrmSprite;
  
      break;
    }
    case 2: {
      const skinnedVrmCrunched = await baseVrm.cloneVrm();
      _crunch(skinnedVrmCrunched);
  
      skinnedVrms['crunch'] = skinnedVrmCrunched;
      skinnedVrms['active'] = skinnedVrmCrunched;
  
      break;
    }
    case 3: {
      console.log('standard quality, already good to go!'); // XXX
      break;
    }
    case 4: {
      await _toonShaderify(baseVrm);
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
    console.log("COMPONANTS", key, value);
    app.setComponent(key, value);
  }

  let arrayBuffer = null;
  const _cloneVrm = async () => {
    const vrm = await parseVrm(arrayBuffer, srcUrl);
    vrm.cloneVrm = _cloneVrm;
    vrm.toonShaderify = _toonShaderify;
    return vrm;
  };
  
  const _prepVrm = (type, vrm) => {
  
    vrm.scene.visible = false;
    app.add(vrm.scene);
    vrm.scene.updateMatrixWorld();
    _addAnisotropy(vrm.scene, 16);
  }

  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);

    const skinnedVrmBase = await _cloneVrm();
    app.skinnedVrms['base'] = skinnedVrmBase;
    app.skinnedVrms['active'] = skinnedVrmBase;


    const quality = getQualitySetting();
    await _setQuality(quality, app.skinnedVrms)

    console.log("app is", app);

    for (const type in app.skinnedVrms) {
      if (type !== 'active' && Object.hasOwnProperty.call(app.skinnedVrms, type)) {
        const vrm = app.skinnedVrms[type];
        _prepVrm(type, vrm);        
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
      console.log("adding physics!");
      _addPhysics();
    }

    activateCb = async () => {
      const localPlayer = useLocalPlayer();
      localPlayer.setAvatarApp(app);
      // console.log(localPlayer.avatar);
      //
      // const quality = parseInt(localStorage.getItem('avatarStyle')) || 4;
      // localPlayer.avatar.setQuality(quality).then(()=>{
      // //
      //   const am = localPlayer.appManager;
      //   const trackedApp = am.getTrackedApp(localPlayer.avatar.app.instanceId);
      //   trackedApp.set('load', true);
      //   // console.log("VRM PLAYER AVATAR", trackedApp.get('load'), localPlayer.avatar);
      // //
        // console.log("VRM ACTIVATED");

    };
  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  app.lookAt = (lookAt => function(p) {
    lookAt.apply(this, arguments);
    this.quaternion.premultiply(q180);
  })(app.lookAt);

<<<<<<< HEAD
  let skinned = false;
  app.setSkinning = async skinning => {
    if (skinning && !skinned) {
      const quality = getQualitySetting();
      if (!app.skinnedVrm) {
        // console.log("SKINNING", app);
        app.skinnedVrm = await _cloneVrm();
          console.log("skinning", app.skinnedVrm.scene.constructor.name, app.skinnedVrm.scene);
        // await _toonShaderify(app.skinnedVrm);
        _setQuality(quality, app.skinnedVrm)
      }

      for (const physicsId of physicsIds) {
        physics.disableGeometry(physicsId);
        physics.disableGeometryQueries(physicsId);
      }
      quality == 1 ? app.unskinnedVrm.spriteMegaAvatarMesh.parent.remove(app.unskinnedVrm.spriteMegaAvatarMesh) :
            app.unskinnedVrm.scene.parent.remove(app.unskinnedVrm.scene);
      // app.unskinnedVrm.spriteMegaAvatarMesh &&
        

      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);
      app.updateMatrixWorld();

      quality == 1 ? app.add(app.skinnedVrm.spriteMegaAvatarMesh) : app.add(app.skinnedVrm.scene);
      

      skinned = true;
    } else if (!skinning && skinned) {
      app.skinnedVrm.scene.parent.remove(app.skinnedVrm.scene);
      app.unskinnedVrm.spriteMegaAvatarMesh &&
      app.unskinnedVrm.spriteMegaAvatarMesh.parent.remove(app.unskinnedVrm.spriteMegaAvatarMesh);

      for (const physicsId of physicsIds) {
        physics.enableGeometry(physicsId);
        physics.enableGeometryQueries(physicsId);
      }

      app.add(app.unskinnedVrm.scene);
      app.unskinnedVrm.spriteMegaAvatarMesh && app.add(app.unskinnedVrm.spriteMegaAvatarMesh);

      skinned = false;
    }
  }

=======
>>>>>>> avatar cruncher and remove unskinned(tmp)
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};
