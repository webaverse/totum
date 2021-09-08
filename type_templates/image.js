import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, usePhysics} = metaversefile;

/* const flipGeomeryUvs = geometry => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
}; */
// console.log('got gif 0');

export default () => {
  const app = useApp();
  
  // const {gifLoader} = useLoaders();
  const physics = usePhysics();

  const srcUrl = '${this.srcUrl}';
  // console.log('got gif 1');

  const physicsIds = [];
  const staticPhysicsIds = [];
  (async () => {
    const img = new Image();
    await new Promise((accept, reject) => {
      img.onload = () => {
        accept();
        // startMonetization(instanceId, monetizationPointer, ownerAddress);
        // _cleanup();
      };
      img.onerror = err => {
        reject(err);
        // _cleanup();
      }
      /* const _cleanup = () => {
        gcFiles && URL.revokeObjectURL(u);
      }; */
      img.crossOrigin = '';
      img.src = srcUrl;
    });
    let {width, height} = img;
    if (width >= height) {
      height /= width;
      width = 1;
    }
    if (height >= width) {
      width /= height;
      height = 1;
    }
    const geometry = new THREE.PlaneBufferGeometry(width, height);
    geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3(-width/2, -height/2, -0.1),
      new THREE.Vector3(width/2, height/2, 0.1),
    );
    const colors = new Float32Array(geometry.attributes.position.array.length);
    colors.fill(1, 0, colors.length);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const texture = new THREE.Texture(img);
    texture.needsUpdate = true;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.5,
    });
    /* const material = meshComposer.material.clone();
    material.uniforms.map.value = texture;
    material.uniforms.map.needsUpdate = true; */

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    // mesh.contentId = contentId;
    app.add(mesh);
    
    const physicsId = physics.addBoxGeometry(
      mesh.position,        
      mesh.quaternion,
      new THREE.Vector3(width/2, height/2, 0.01),
      false
    );
    physicsIds.push(physicsId);
    staticPhysicsIds.push(physicsId);
    
  })();
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
    staticPhysicsIds.length = 0;
  });

  return app;
};