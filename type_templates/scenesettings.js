// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useSceneSettingsManager, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  console.log('creating scene settings app');
  const sceneSettings = useSceneSettingsManager();

  console.log('sceneSettings', sceneSettings)

  const srcUrl = ${this.srcUrl};

  let live = true;
  let json = null;
  let localSceneSettings = null;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    json = await res.json();
    console.log('json is', json)
    if (!live) return;
    localSceneSettings = sceneSettings.makeSceneSettings(json);
  })();
  
  useCleanup(() => {
    live = false;
    localSceneSettings = null;
  });

  app.getSceneSettings = () => localSceneSettings;

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'scenesettings';
export const components = ${this.components};