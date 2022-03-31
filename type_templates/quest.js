// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useQuests, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  app.appType = 'quest';

  const questManager = useQuests();

  const srcUrl = ${this.srcUrl};
  // console.log('quest got src url', srcUrl);

  const _getPaused = () => app.getComponent('paused') ?? false;
  const _bindQuest = () => {
    let live = true;
    let quest = null;
    (async () => {
      const res = await fetch(srcUrl);
      if (!live) return;
      const j = await res.json();
      // console.log('got quest json', j);
      if (!live) return;

      quest = questManager.addQuest(j);
    })();
  };
  const _unbindQuest = () => {
    if (quest !== null) {
      questManager.removeQuest(quest);
      quest = null;
    }
  };

  app.addEventListener('componentsupdate', e => {
    const {keys} = e.data;
    if (keys.includes('paused')) {
      const paused = _getPaused();

      if (!paused) {
        _bindQuest();
      }
      
      useCleanup(() => {
        live = false;

        _unbindQuest();
      });
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};