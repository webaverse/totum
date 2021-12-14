import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer, useGradientMapsInternal} = metaversefile;

const q180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const loadVrm = async (srcUrl) => {
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
  } /* finally {
    if (/^blob:/.test(srcUrl)) {
      gcFiles && URL.revokeObjectURL(srcUrl);
    }
  } */
  return vrmObject;
};
const parseVrm = (arrayBuffer, srcUrl) => new Promise((accept, reject) => {
  const {gltfLoader} = useLoaders();
  gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
});
const _findMaterialsObjects = (o, name) => {
  const result = [];
  o.traverse(o => {
    if (o.isMesh && o.material.name === name) {
      result.push(o);
    }
  });
  return result;
};
const _toonShaderify = o => {
  const vrmExtension = o.userData.gltfExtensions.VRM;
  const {materialProperties} = vrmExtension;
  
  const materialMap = new Map();
  const {
    // threeTone,
    // fiveTone,
    twentyTone,
  } = useGradientMapsInternal();
  const gradientMap = twentyTone;
  
  for (const materialProperty of materialProperties) {
    const {name, shader} = materialProperty;
    if (shader === 'VRM/MToon') {
      const objects = _findMaterialsObjects(o.scene, name);
      for (const object of objects) {
        const oldMaterial = object.material;
        let newMaterial = materialMap.get(oldMaterial);
        
        if (!newMaterial) {
          const opts = {};
          const copyKeys = [
            'alphaMap',
            'aoMap',
            'aoMapIntensity',
            'bumpMap',
            'bumpScale',
            'color',
            'displacementMap',
            'displacementScale',
            'displacementBias',
            'emissive',
            'emissiveMap',
            'emissiveIntensity',
            // 'gradientMap',
            'lightMap',
            'lightMapIntensity',
            'map',
            'normalMap',
            'normalMapType',
            'normalScale',
            'wireframe',
            'wireframeLinecap',
            'wireframeLinejoin',
            'wireframeLinewidth',
            'transparent',
            'alphaTest',
            'opacity',
            'side',
            'premultipliedAlpha',
            'polygonOffset',
            'polygonOffsetFactor',
            'polygonOffsetUnits',
            'depthTest',
            'depthWrite',
          ];
          for (const key of copyKeys) {
            const value = object.material[key];
            if (value !== undefined) {
              opts[key] = value;
            }
          }
          opts.gradientMap = gradientMap;
          newMaterial = new THREE.MeshToonMaterial(opts);
          materialMap.set(oldMaterial, newMaterial);
        }
        object.material = newMaterial;
      }
    }
  }
};

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
    app.setComponent(key, value);
  }
  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    const unskinnedVrm = await loadVrm(srcUrl);
    if (unskinnedVrm) {
      _toonShaderify(unskinnedVrm);
      app.unskinnedVrm = unskinnedVrm;
      app.add(unskinnedVrm.scene);
      
      const _addAntialiasing = aaLevel => {
        unskinnedVrm.scene.traverse(o => {
          if (o.isMesh) {
            ['alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'map', 'metalnessMap', 'normalMap', 'roughnessMap'].forEach(mapType => {
              if (o.material[mapType]) {
                o.material[mapType].anisotropy = aaLevel;
              }
            });
          }
        });
      };
      _addAntialiasing(16);
      
      const _unskin = () => {
        // elide expensive bone updates; this should not be called if wearing the avatar
        // debugger;
        const skinnedMeshes = [];
        unskinnedVrm.scene.traverse(o => {
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
          mesh.updateMatrixWorld(true);
          mesh.visible = visible;
          mesh.parent = parent;
          const index = parent ? parent.children.indexOf(skinnedMesh) : -1;
          if (index !== -1) {
            parent.children.splice(index, 1, mesh);
          }
        }
      };
      _unskin();

      const _addPhysics = () => {
        const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 1.5/2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0.3, 1.5/2, 0.3),
          false
        );
        physicsIds.push(physicsId);
      };
      if (app.getComponent('physics')) {
        // console.log('add physics');
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
  /* const oldPosition = new THREE.Vector3();
  const oldQuaternion = new THREE.Quaternion();
  const oldScale = new THREE.Vector3(); */
  app.setSkinning = async (skinning) => {
    if (skinning && !skinned) {
      if (!app.skinnedVrm) {
        app.skinnedVrm = await parseVrm(app.unskinnedVrm.arrayBuffer, srcUrl);
        _toonShaderify(app.skinnedVrm);
      }
      
      app.unskinnedVrm.scene.parent.remove(app.unskinnedVrm.scene);
      
      /* oldPosition.copy(app.position);
      oldQuaternion.copy(app.quaternion);
      oldScale.copy(app.scale); */
      
      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);
      app.updateMatrix();
      app.updateMatrixWorld(true);
      
      app.add(app.skinnedVrm.scene);
      
      skinned = true;
    } else if (!skinning && skinned) {
      app.skinnedVrm.scene.parent.remove(app.skinnedVrm.scene);
      
      /* app.position.copy(oldPosition);
      app.quaternion.copy(oldQuaternion);
      app.scale.copy(oldScale);
      app.updateMatrixWorld(true); */
      
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