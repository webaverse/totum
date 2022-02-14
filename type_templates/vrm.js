import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { VRMMaterialImporter } from '@pixiv/three-vrm/lib/three-vrm.module';
const {useApp, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer, useAvatarSpriter, getQualitySetting} = metaversefile;

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
const _toonShaderify = async o => {
  await new VRMMaterialImporter().convertGLTFMaterials(o);
};
const _spritify = o => {
  o.spriteMegaAvatarMesh = useAvatarSpriter().createSpriteMegaMesh(o);
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
const _unskin = o => { // process avatar to elide expensive bone updates
  console.log("unskinning", o.constructor.name, o);
  const skinnedMeshes = [];
  o.traverse(o => {
    if (o.isSkinnedMesh) {
      skinnedMeshes.push(o);
    }
  });

  for (const skinnedMesh of skinnedMeshes) {
    const {geometry, material, position, quaternion, scale, matrix, matrixWorld, visible, parent} = skinnedMesh;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    mesh.scale.copy(scale);
    mesh.matrix.copy(matrix);
    mesh.matrixWorld.copy(matrixWorld);
    mesh.visible = visible;
    mesh.parent = parent;
    const index = parent ? parent.children.indexOf(skinnedMesh) : -1;
    if (index !== -1) {
      parent.children.splice(index, 1, mesh);
    }
  }
  /* for (const skinnedMesh of skinnedMeshes) {
    const skeleton = skinnedMesh.skeleton;
    for (const bone of skeleton.bones) {
      if (bone.parent && !bone.parent.isBone) {
        bone.oldParent = bone.parent;
        bone.parent.remove(bone);
      }
    }
  } */
};

const _setQuality = async (quality, vrm)=> {
  switch (quality) {
    case 1: {
      _spritify(vrm);
      break;
    }
    case 2: {
      console.log('crunched not yet implemented'); // XXX
      break;
    }
    case 3: {
      console.log('standard quality, already good to go!'); // XXX
      break;
    }
    case 4: {
      await _toonShaderify(vrm);
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

  app.skinnedVrm = null;
  app.unskinnedVrm = null;

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

  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);

    const unskinnedVrm = await _cloneVrm();
    if (unskinnedVrm) {
      const quality = getQualitySetting();

      _setQuality(quality, unskinnedVrm)

      app.unskinnedVrm = unskinnedVrm;
      console.log("app is", app);

      app.add(quality == 1 ? unskinnedVrm.spriteMegaAvatarMesh : unskinnedVrm.scene);
      // unskinnedVrm.spriteMegaAvatarMesh && app.add(unskinnedVrm.spriteMegaAvatarMesh);
      unskinnedVrm.scene.updateMatrixWorld();

      _addAnisotropy(unskinnedVrm.scene, 16);
      _unskin(unskinnedVrm.scene);
      unskinnedVrm.spriteMegaAvatarMesh && _unskin(unskinnedVrm.spriteMegaAvatarMesh);    

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
    }
  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  app.lookAt = (lookAt => function(p) {
    lookAt.apply(this, arguments);
    this.quaternion.premultiply(q180);
  })(app.lookAt);

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

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};
