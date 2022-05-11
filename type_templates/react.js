// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useDomRenderer, useInternals, useCleanup} = metaversefile;

let baseUrl = import.meta.url.replace(/(\\/)[^\\/\\\\]*$/, '$1');
const bu = new URL(baseUrl);
const proxyPrefix ='/@proxy/';
if (bu.pathname.startsWith(proxyPrefix)) {
  baseUrl = bu.pathname.slice(proxyPrefix.length) + bu.search + bu.hash;
}

export default e => {  
  const app = useApp();
  const {sceneLowerPriority} = useInternals();
  const domRenderEngine = useDomRenderer();

  let srcUrl = ${this.srcUrl};
  
  let dom = null;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();
    let {jsxUrl} = json;
    jsxUrl = new URL(jsxUrl, baseUrl).href;
    const m = await import(jsxUrl);
  
    dom = domRenderEngine.addDom({
      render: () => m.default(),
    });

    sceneLowerPriority.add(dom);
    dom.updateMatrixWorld();
  })());

  useFrame(() => {
    if (dom) {
      app.matrixWorld.decompose(dom.position, dom.quaternion, dom.scale);
      dom.updateMatrixWorld();
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'react';
export const components = ${this.components};