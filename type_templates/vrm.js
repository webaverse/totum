import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { VRMMaterialImporter } from '@pixiv/three-vrm/lib/three-vrm.module';
const {useApp, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer} = metaversefile;

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

export default e => {
  const physics = usePhysics();
  
  const app = useApp();
  app.appType = 'vrm';
  
  app.skinnedVrm = null;
  app.unskinnedVrm = null;
  
  const srcUrl = ${this.srcUrl};
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }

  let arrayBuffer = null;
  const _cloneVrm = async () => {
    const vrm = await parseVrm(arrayBuffer, srcUrl);
    vrm.cloneVrm = _cloneVrm;
    return vrm;
  };

  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    arrayBuffer = await _fetchArrayBuffer(srcUrl);

    const unskinnedVrm = await _cloneVrm();
    if (unskinnedVrm) {
      await _toonShaderify(unskinnedVrm);
      app.unskinnedVrm = unskinnedVrm;

      app.add(unskinnedVrm.scene);
      unskinnedVrm.scene.updateMatrixWorld();
      
      _addAnisotropy(unskinnedVrm.scene, 16);
      _unskin(unskinnedVrm.scene);

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
      if (!app.skinnedVrm) {
        app.skinnedVrm = await _cloneVrm();
        await _toonShaderify(app.skinnedVrm);
      }

      for (const physicsId of physicsIds) {
        physics.disableGeometry(physicsId);
        physics.disableGeometryQueries(physicsId);
      }

      app.unskinnedVrm.scene.parent.remove(app.unskinnedVrm.scene);
      
      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);
      app.updateMatrixWorld();
      
      app.add(app.skinnedVrm.scene);
      
      skinned = true;
    } else if (!skinning && skinned) {
      app.skinnedVrm.scene.parent.remove(app.skinnedVrm.scene);
      
      for (const physicsId of physicsIds) {
        physics.enableGeometry(physicsId);
        physics.enableGeometryQueries(physicsId);
      }
      
      app.add(app.unskinnedVrm.scene);
      
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
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};