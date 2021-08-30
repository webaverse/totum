import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useLoaders, usePhysics, useCleanup} = metaversefile;

export default () => {
  const o = new THREE.Object3D();
  
  const srcUrl = '${this.srcUrl}';
  let physicsIds = [];
  let staticPhysicsIds = [];
  (async () => {
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

      // o.isVrm = true;
      // o.contentId = contentId;
      o.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false;
        }
      });

      const _run = () => {
        const physicsId = usePhysics().addBoxGeometry(
          o.position.clone()
            .add(
              new THREE.Vector3(0, 1.5/2, 0)
                .applyQuaternion(o.quaternion)
            ),
            o.quaternion,
            new THREE.Vector3(0.3, 1.5/2, 0.3),
            false
        );
        physicsIds.push(physicsId);
        staticPhysicsIds.push(physicsId);
        
        // elide expensive bone updates; this should not be called if wearing the avatar
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
      _run();
    }
  })();
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      usePhysics().removeGeometry(physicsId);
    }
    physicsIds.length = 0;
    staticPhysicsIds.length = 0;
  });

  return o;
};