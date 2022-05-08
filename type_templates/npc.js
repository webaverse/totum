// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useNpcManager, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const npcManager = useNpcManager();

  const srcUrl = ${this.srcUrl};

  let live = true;
  let added = false;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    const json = await res.json();
    if (!live) return;

    npcManager.addNpcApp(app, json);
    added = true;
  })();

  useCleanup(() => {
    if (added) {
      npcManager.removeNpcApp(app);
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'npc';
export const components = ${this.components};