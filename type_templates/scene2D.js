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
      const scene2D = await res.json();
      if (scene2D) {
        let cameraType = "orthographic";
        let perspective = scene2D.perspective ? scene2D.perspective : "side-scroll";
        let cameraMode = scene2D.cameraMode ? scene2D.cameraMode : "follow";
        let scrollDirection = scene2D.scrollDirection ? scene2D.scrollDirection : "both";
        let viewS = scene2D.viewSize ? scene2D.viewSize : 15;
        cameraManager.enable2D(perspective, cameraMode, viewS, scrollDirection);
      }
    })();
    
    useCleanup(() => {
        cameraManager.disable2D();
    });
  }

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'settings';
export const components = ${this.components};