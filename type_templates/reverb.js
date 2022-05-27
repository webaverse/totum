import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useCleanup, setReverbZones, removeReverbZone} = metaversefile;


export default e => {
  const app = useApp();
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
        setReverbZones(reverbZoneInfo)
      }
    })();
  }

  useCleanup(() => {
    removeReverbZone(reverbZoneInfo);
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'reverbZone';
export const components = ${this.components}; 