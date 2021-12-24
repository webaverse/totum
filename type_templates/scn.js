import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, addTrackedApp, removeTrackedApp, useCleanup} = metaversefile;

function getObjectUrl(object) {
  let {start_url, type, content} = object;
  
  let u;
  if (start_url) {
    // make path relative to the .scn file
    u = /^\\.\\//.test(start_url) ? (new URL(import.meta.url).pathname.replace(/(\\/)[^\\/]*$/, '$1') + start_url.replace(/^\\.\\//, '')) : start_url;
  } else if (type && content) {
    if (typeof content === 'object') {
      content = JSON.stringify(content);
    }
    u = '/@proxy/data:' + type + ',' + encodeURI(content);
  } else {
    throw new Error('invalid scene object: ' + JSON.stringify(object));
  }
  return u;
}

export default e => {
  const app = useApp();
  app.appType = 'scn';
  
  const srcUrl = '${this.srcUrl}';
  
  let live = true;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    const buckets = [];
    
    objects.sort((a, b)=> {
      if(!a.loadPriority) a["loadPriority"] = 0;
      if(!b.loadPriority) b["loadPriority"] = 0;
      return a.loadPriority - b.loadPriority;
    });

    let loadPriority = objects[0].loadPriority;
    let start = 0;
    
    for(let i=0; i<objects.length; i++) {
      if(objects[i].loadPriority !== loadPriority) {
        loadPriority = objects[i].loadPriority;
        buckets.push(objects.slice(start, i));
        start = i;
      }
    }
    buckets.push(objects.slice(start, objects.length));

    for(let i=0; i<buckets.length; i++) {
      const bucket = buckets[i];
      const promises = bucket.map(async object => {
        if (live) {
          let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
          position = new THREE.Vector3().fromArray(position);
          quaternion = new THREE.Quaternion().fromArray(quaternion);
          scale = new THREE.Vector3().fromArray(scale);
          
          const u2 = getObjectUrl(object);
          await addTrackedApp(u2, position, quaternion, scale, components);
        }
      });
      await Promise.all(promises);
    }
  })());
  
  useCleanup(() => {
    live = false;
  });

  return true;
};