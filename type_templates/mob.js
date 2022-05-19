// import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useMobManager, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const mobManager = useMobManager();

  const srcUrl = ${this.srcUrl};

  mobManager.addMobApp(app, srcUrl);

  useCleanup(() => {
    console.log('mod totum app cleanup 1');
    mobManager.removeMobApp(app);
    console.log('mod totum app cleanup 2');
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'mob';
export const components = ${this.components};