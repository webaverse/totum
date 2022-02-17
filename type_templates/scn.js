import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, addTrackedApp, removeTrackedApp, useCleanup, useLocalPlayer, createAvatar, useWorld, useAvatarSpriter, useNpcPlayerInternal} = metaversefile;

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
    const buckets = {};

    for (const object of objects) {
      const lp = object.loadPriority ?? 0;
      let a = buckets[lp];
      if (!a) {
        a = [];
        buckets[lp] = a;
      }
      a.push(object);
    }

    const sKeys = Object.keys(buckets).sort((a, b)=>{
      return a - b;
    });

    for (let i=0; i<sKeys.length; i++) {
      const lp = sKeys[i];
      await Promise.all(buckets[lp].map(async object=>{
        if (live) {
          let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
          position = new THREE.Vector3().fromArray(position);
          quaternion = new THREE.Quaternion().fromArray(quaternion);
          scale = new THREE.Vector3().fromArray(scale);

          const u2 = getObjectUrl(object);
          const load = !object.is_player;

          if (object.is_player){
            console.log("object is a player", useLocalPlayer());
            if (useLocalPlayer().avatar){
              console.log("ALREADY HAVE AVATAR");
              return; //don't add another local player avatar if you've set one in the application.
            }
            const trackedApp = await useLocalPlayer().appManager.addTrackedApp(u2, position, quaternion, scale, components, load );
            // if (trackedApp.appType == "vrm") console.log("TRACKED APP IS NOW", trackedApp, load);
            trackedApp.activate();
          } else {
            console.log("object is not a player");
            const trackedApp = await addTrackedApp(u2, position, quaternion, scale, components );

            if (object.is_npc && trackedApp && trackedApp.appType == "vrm") {
              const NPC = useNpcPlayerInternal();
              const npc = new NPC();
              await npc.setAvatarAppAsync(trackedApp);
              // npc['app'] = trackedApp;
              // trackedApp['avatar'] = avatar;
            } else {
              trackedApp.children && trackedApp.children.length && (trackedApp.children[0].visible = true);
            }
          }

        }
      }));
    }

  })());

  useCleanup(() => {
    live = false;
  });

  return true;
};
