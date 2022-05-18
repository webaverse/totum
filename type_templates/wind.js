import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useCleanup, getWinds} = metaversefile;


export default e => {
  const app = useApp();
  let worldWinds = getWinds();
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  let j = null;
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      j = await res.json();
      if (j) {
        worldWinds.push(j);
      }
    })();
  }
  
  useCleanup(() => {
    const index = worldWinds.indexOf(j);
    if (index > -1) {
      worldWinds.splice(index, 1);
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'wind';
export const components = ${this.components};