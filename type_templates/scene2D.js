import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useCameraManager, useCamera, useCleanup, useScene2DManager} = metaversefile;

export default e => {
  const app = useApp();
  const cameraManager = useCameraManager();
  const camera = useCamera();
  const scene2DManager = useScene2DManager();

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
        let controls = scene2D.controls ? scene2D.controls : "default";
        let viewS = scene2D.viewSize ? scene2D.viewSize : 15;
        scene2DManager.setMode(perspective, cameraMode, viewS, scrollDirection, controls);
      }
    })();

    useCleanup(() => {
      scene2DManager.reset();
    });
  }

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'scene2D';
export const components = ${this.components};
