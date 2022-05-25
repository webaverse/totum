// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useNpcManager, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const npcManager = useNpcManager();

  const srcUrl = ${this.srcUrl};

  console.log('add npc app 0', app);
  e.waitUntil((async () => {
    console.log('add npc app 1', app);
    await npcManager.addNpcApp(app, srcUrl);
    console.log('add npc app 2', app);
  })());

  useCleanup(() => {
    npcManager.removeNpcApp(app);
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'npc';
export const components = ${this.components};