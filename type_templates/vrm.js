import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, usePhysics, useCleanup} = metaversefile;

export default e => {
  const physics = usePhysics();
  
  const app = useApp();
  const o = app;
  
  const srcUrl = '${this.srcUrl}';
  let physicsIds = [];
  let staticPhysicsIds = [];
  e.waitUntil((async () => {
    let vrmObject;
    try {
      vrmObject = await new Promise((accept, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(srcUrl, accept, function onprogress() {}, reject);
      });
      // startMonetization(instanceId, monetizationPointer, ownerAddress);
    } catch(err) {
      console.warn(err);
      vrmObject = null;
    } /* finally {
      if (/^blob:/.test(srcUrl)) {
        gcFiles && URL.revokeObjectURL(srcUrl);
      }
    } */

    if (vrmObject) {
      o.raw = vrmObject;
      o.add(vrmObject.scene);
      /* const jitterObject = hpManager.makeHitTracker();
      o.add(jitterObject);
      jitterObject.add(vrmObject.scene);
      jitterObject.addEventListener('hit', e => {
        mesh.dispatchEvent(e);
      });
      jitterObject.addEventListener('die', e => {
        o.dispatchEvent(e);
      }); */

      /* const skinnedMeshes = [];
      o.traverse(o => {
        // console.log('got o', o);
        if (o.isSkinnedMesh) {
          skinnedMeshes.push(o);
        }
      });
      if (skinnedMeshes.length > 0) {
        console.log('got skinned meshes', o, vrmObject.scene, skinnedMeshes);
      } else {
        debugger;
      } */

      // o.isVrm = true;
      // o.contentId = contentId;
      /* o.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false;
        }
      }); */

      const _addPhysics = () => {
        const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 1.5/2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0.3, 1.5/2, 0.3),
          false
        );
        physicsIds.push(physicsId);
        staticPhysicsIds.push(physicsId);
        
        // elide expensive bone updates; this should not be called if wearing the avatar
        // debugger;
        const skinnedMeshes = [];
        o.traverse(o => {
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
      if (app.getAttribute('physics')) {
        // console.log('add physics');
        _addPhysics();
      }
    }
  })());

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
    staticPhysicsIds.length = 0;
  });

  return o;
};