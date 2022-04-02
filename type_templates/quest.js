// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useQuests, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  app.appType = 'quest';

  const questManager = useQuests();

  const srcUrl = ${this.srcUrl};

  let j;
  e.waitUntil(() => {
    (async () => {
      const res = await fetch(srcUrl);
      j = await res.json();
      
    })();
  });

  let quest = null;
  const _getPaused = () => app.getComponent('paused') ?? false;
  const _bindQuest = () => {
    (async () => {
      const res = await fetch(srcUrl);
      const j = await res.json();

      quest = questManager.addQuest(j);
    })();
  };
  const _unbindQuest = () => {
    questManager.removeQuest(quest);
    quest = null;
  };
  const _checkPaused = () => {
    const paused = _getPaused();
    if (!paused && quest === null) {
      _bindQuest();
    } else if (paused && quest !== null) {
      _unbindQuest();
    }
  };
  _checkPaused();

  app.addEventListener('componentsupdate', e => {
    const {keys} = e.data;
    if (keys.includes('paused')) {
      _check();
    }
  });

  useCleanup(() => {
    quest !== null && _unbindQuest();
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};