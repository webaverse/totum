import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useCameraManager, useCamera, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const cameraManager = useCameraManager();
  const camera = useCamera();
  
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      const j = await res.json();
      if (j) {
        cameraManager.modeIs2D = j.enable2D;
        // const targetQuaternion = new THREE.Quaternion();
        // targetQuaternion.setFromRotationMatrix(
        // new THREE.Matrix4().lookAt(
        //     new THREE.Vector3(0,0,1),
        //     new THREE.Vector3(0,0,0),
        //     new THREE.Vector3(0,1,0)
        // ));
        let point = new THREE.Vector3(0,0,1);
        point.add(cameraManager.targetPosition);
        camera.lookAt(point);
        camera.position.copy(point);
        camera.updateMatrixWorld();
        //cameraManager.focusCamera(point);
        //camera.updateMatrixWorld();
      }
    })();
    
    useCleanup(() => {
        cameraManager.modeIs2D = false;
    });
  }

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'settings';
export const components = ${this.components};