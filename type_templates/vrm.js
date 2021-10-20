import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useActivate, useLocalPlayer} = metaversefile;

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

export default e => {
  const physics = usePhysics();
  
  const app = useApp();
  app.skinnedVrm = null;
  app.unskinnedVrm = null;
  
  const srcUrl = '${this.srcUrl}';
  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    const unskinnedVrm = await loadVrm(srcUrl);
    if (unskinnedVrm) {
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
      
      const oldPosition = new THREE.Vector3();
      const oldQuaternion = new THREE.Quaternion();
      const oldScale = new THREE.Vector3();
      app.addEventListener('wearupdate', e => {
        if (e.wear) {
          e.waitUntil((async () => {
            if (!app.skinnedVrm) {
              app.skinnedVrm = await parseVrm(app.unskinnedVrm.arrayBuffer, srcUrl);
            }
            
            app.unskinnedVrm.scene.parent.remove(app.unskinnedVrm.scene);
            
            oldPosition.copy(app.position);
            oldQuaternion.copy(app.quaternion);
            oldScale.copy(app.scale);
            
            app.position.set(0, 0, 0);
            app.quaternion.identity();
            app.scale.set(1, 1, 1);
            app.updateMatrixWorld();
            
            app.add(app.skinnedVrm.scene);
          })());
        } else {
          app.skinnedVrm.scene.parent.remove(app.skinnedVrm.scene);
          
          app.position.copy(oldPosition);
          app.quaternion.copy(oldQuaternion);
          app.scale.copy(oldScale);
          app.updateMatrixWorld();
          
          app.add(app.unskinnedVrm.scene);
        }
      });
      
      activateCb = async () => {
        const localPlayer = useLocalPlayer();
        localPlayer.setAvatar(app);
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

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};