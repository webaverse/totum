// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useQuests, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  app.appType = 'quest';

  const questManager = useQuests();

  const srcUrl = ${this.srcUrl};

  let j;
  const loadPromise = (async () => {
    const res = await fetch(srcUrl);
    j = await res.json();
  })();
  e.waitUntil(loadPromise);

  let quest = null;
  const _getPaused = () => app.getComponent('paused') ?? false;
  const _bindQuest = () => {
    quest = questManager.addQuest(j);
  };
  const _unbindQuest = () => {
    questManager.removeQuest(quest);
    quest = null;
  };
  const _checkPaused = async () => {
    await loadPromise;
    
    const paused = _getPaused();
    if (!paused && quest === null) {
      _bindQuest();
    } else if (paused && quest !== null) {
      _unbindQuest();
    }
  };
  _checkPaused();

  app.addEventListener('componentsupdate', e => {
    if (e.keys.includes('paused')) {
      _checkPaused();
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