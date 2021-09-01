import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useLoaders, usePhysics, useCleanup} = metaversefile;

export default () => {
  const o = new THREE.Object3D();
  
  const srcUrl = '${this.srcUrl}';
  console.log('load html', srcUrl);

  return o;
};