import * as THREE from 'three';
import metaversefile from 'metaversefile';
const { useApp, addTrackedApp, useCleanup } = metaversefile;

function typeContentToUrl(type, content) {
  if (typeof content === 'object') {
    content = JSON.stringify(content);
  }
  const dataUrlPrefix = 'data:' + type + ',';
  return '/@proxy/' + dataUrlPrefix + encodeURIComponent(content).replace(/\%/g, '%25')//.replace(/\\//g, '%2F');
}
function getObjectUrl(object) {
  let { source, type, content } = object;
  let start_url = source && source.url;
  let u;
  if (start_url) {
    // make path relative to the .scn file
    let isRelativePath = false;
    if (start_url.startsWith('.') || start_url.startsWith('/')) {
      isRelativePath = true;
    }
    u = isRelativePath ? (new URL(import.meta.url).pathname.replace(/(\\/)[^\\/]*$/, '$1') + start_url.replace(/^\\.\\/ /, '')) : start_url;
    // explain the above line of code
    // 1. start_url is a relative path
    // 2. the first test is to make sure that the path is not absolute
    // 3. the second test is to make sure that the path is not absolute but starts with a './'
  } else if (type && content) {
    u = typeContentToUrl(type, content);
  } else {
    throw new Error('invalid scene object: ' + JSON.stringify(object));
  }
  return u;
}
function mergeComponents(a, b) {
  const result = a.map(({
    key,
    value,
  }) => ({
    key,
    value,
  }));
  for (let i = 0; i < b.length; i++) {
    const bComponent = b[i];
    const { key, value } = bComponent;
    let aComponent = result.find(c => c.key === key);
    if (!aComponent) {
      aComponent = {
        key,
        value,
      };
      result.push(aComponent);
    } else {
      aComponent.value = value;
    }
  }
  return result;
}

export default e => {
  const app = useApp();

  const srcUrl = ${ this.srcUrl };

  const objectComponents = app.getComponent('objectComponents') ?? [];
  const loadApp = (() => {
    return async (url, position, quaternion, scale, components) => {
      components = mergeComponents(components, objectComponents);
      await addTrackedApp(url, position, quaternion, scale, components);
    };
  })();

  let live = true;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();

    const { slug } = j;

    const api = 'https://api.hyperfy.io/components/' + slug;
    const hyperfyRes = await fetch(api);
    const json = await hyperfyRes.json();

    const state = JSON.parse(json.editorState);

    const { objects } = state;

    const buckets = {};

    for (const obj in objects) {
      const object = objects[obj];
      const lp = object.loadPriority ?? 0;
      let a = buckets[lp];
      if (!a) {
        a = [];
        buckets[lp] = a;
      }
      a.push(object);
    }

    const sKeys = Object.keys(buckets).sort((a, b) => a - b);

    for (let i = 0; i < sKeys.length; i++) {
      const lp = sKeys[i];
      await Promise.all(buckets[lp].map(async object => {
        if (live) {
          const position = new THREE.Vector3().fromArray(object.position ?? [0, 0, 0]);
          const rotation = new THREE.Euler().fromArray(object.rotation ?? [0, 0, 0]);
          const quaternion = new THREE.Quaternion().setFromEuler(rotation);
          const scale = new THREE.Vector3().fromArray(object.scale ?? [1, 1, 1]);

          if ((object.source && object.source.url.includes('.mp4'))) {
          } else {
            if (object.name === 'text') {
              object.type = "application/text";
              object.content = {
                text: object.value,
                font: object.font ?? "./fonts/Bangers-Regular.ttf",
                fontSize: object.fontSize,
                anchorX: object.anchorX,
                anchorY: object.anchorY,
                color: object.color
              }
            } else if (object.name === 'spawn') {
              object.type = "application/spawnpoint";
              object.content = {
                position: object.position,
                rotation: object.rotation
              }
            }

            const url = getObjectUrl(object);
            await loadApp(url, position, quaternion, scale, components);
          }
        }
      }));
    }
  })());

  useCleanup(() => {
    live = false;
  });

  app.hasSubApps = true;

  return true;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const type = 'hyperfy';
export const components = ${ this.components };