import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useDomRenderer, useInternals, useCleanup} = metaversefile;
// import renderModule from ${this.srcUrl};

let baseUrl = import.meta.url.replace(/(\\/)[^\\/\\\\]*$/, '$1');
const bu = new URL(baseUrl);
const proxyPrefix ='/@proxy/';
if (bu.pathname.startsWith(proxyPrefix)) {
  baseUrl = bu.pathname.slice(proxyPrefix.length) + bu.search + bu.hash;
  console.log('replace base urll', {bu, baseUrl});
} else {
  console.log('does not start with', {baseUrl});
}

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();

console.log('react app 0');

window.fetch2 = fetch;
window.import2 = s => import(s);

/* // concatenates a new URL() object into a string, including everything like the protocol, search and hash parts
const stringifyUrl = url => {
  let s = '';
  s += url.protocol + '//';
  s += url.host + url.path;
  s += url.search;
  s += url.hash;
  return s;
}; */

export default e => {
  console.log('react app 1', e);
  
  const app = useApp();
  const {sceneLowerPriority} = useInternals();
  const domRenderEngine = useDomRenderer();

  let srcUrl = ${this.srcUrl};
  // srcUrl = new URL(srcUrl, window.location.href).href + '?noimport=1';

  console.log('react app 2', domRenderEngine, srcUrl);

  let dom = null;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();
    let {jsxUrl} = json;
    console.log('react app 3.1', {jsxUrl, json, baseUrl});
    jsxUrl = new URL(jsxUrl, baseUrl).href;
    console.log('react app 3.2', {jsxUrl, json, baseUrl});
    // jsxUrl = './chest/' + jsxUrl.replace(/^\\.\\//g, '');
    // console.log('react app 3.3', {jsxUrl, json, baseUrl});
    const m = await import(jsxUrl);
    console.log('react app 3.3', jsxUrl, m);
  
    dom = domRenderEngine.addDom({
      render: () => m.default(),
    });
    console.log('react app 5', jsxUrl, m, app, dom);

    sceneLowerPriority.add(dom);
    dom.updateMatrixWorld();

    console.log('react app 5', jsxUrl, m, app, dom, sceneLowerPriority);
  })());

  useFrame(() => {
    if (dom) {
      app.matrixWorld.decompose(dom.position, dom.quaternion, dom.scale);
      // console.log('update dom', dom.position.toArray().join(','), dom.quaternion.toArray().join(','), dom.scale.toArray().join(','));
      // dom.position.copy(app.position);
      // dom.quaternion.copy(app.quaternion);
      // dom.scale.copy(app.scale);
      // dom.matrix.copy(app.matrix);
      // dom.matrixWorld.copy(app.matrixWorld);
      dom.updateMatrixWorld();
    }
  });

  console.log('react app 4');

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'react';
export const components = ${this.components};