// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useGameSettingsManager, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const gameSettings = useGameSettingsManager();

  const srcUrl = ${this.srcUrl};

  let live = true;
  let json = null;
  let localGameSettings = null;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    json = await res.json();
    console.log('json is', json)
    if (!live) return;
    localGameSettings = gameSettings.makeGameSettings(json);
  })();
  
  useCleanup(() => {
    live = false;
    localGameSettings = null;
  });

  app.getGameSettings = () => localGameSettings;

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'gamesettings';
export const components = ${this.components};