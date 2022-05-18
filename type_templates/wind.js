import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useLocalPlayer, useNpcManager, useCleanup, useFrame} = metaversefile;

const localEuler = new THREE.Euler(0, 0, 0, 'YXZ');

export default e => {
  const app = useApp();
  const localPlayer = useLocalPlayer();
  const npcManager = useNpcManager();
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  let j = null;
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      j = await res.json();
      if (j) {
        let {windType} = j;
        localPlayer.characterFx.setWind(j);
        //localPlayer.characterFx.windType = windType;
      }
    })();
  }
  let lastLength = 0;
  useFrame(({timestamp}) => {
    if(j &&  npcManager.npcs.length !== lastLength){
      let {windType} = j;
      while(lastLength !== npcManager.npcs.length){
        npcManager.npcs[lastLength].characterFx.setWind(j);
        // npcManager.npcs[lastLength].characterFx.windType = windType; 
        // console.log(npcManager.npcs[lastLength].characterFx)
        lastLength++;
      }
    }
  });
  useCleanup(() => {
    localPlayer.characterFx.setWind(null);
    //localPlayer.characterFx.windType = null;
    for(const npc of npcManager.npcs){
      npc.characterFx.setWind(null);
      //npc.characterFx.windType = null;
    }
    
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'wind';
export const components = ${this.components};