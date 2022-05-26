import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useCleanup, getReverbZone} = metaversefile;


export default e => {
  const app = useApp();
  let worldReverbZone = getReverbZone();
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  let j = null;
  let reverbZoneInfo = null;
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      j = await res.json();
      reverbZoneInfo = j.args;
      if (j) {
        worldReverbZone.push(reverbZoneInfo);
      }
    })();
  }

  useCleanup(() => {
    const index = worldReverbZone.indexOf(reverbZoneInfo);
    if (index > -1) {
        worldReverbZone.splice(index, 1);
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'reverbZone';
export const components = ${this.components}; 