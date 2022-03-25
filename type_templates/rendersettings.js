import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useInternals, useRenderSettings, usePostProcessing, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const renderSettings = useRenderSettings();
  // const postProcessing = usePostProcessing();
  // const {rootScene} = useInternals();

  app.appType = 'rendersettings';

  const srcUrl = ${this.srcUrl};

  /* const _isRenderable = () => {
    const paused = app.getComponent('paused') ?? false;
    const rendering = app.getComponent('rendering') ?? false;
    return !paused || rendering;
  }; */

  let live = true;
  let json = null;
  let localRenderSettings = null;
  (async () => {
    const res = await fetch(srcUrl);
    if (!live) return;
    json = await res.json();
    if (!live) return;
    localRenderSettings = renderSettings.makeRenderSettings(json);

    /* if (_isRenderable()) {
      _bind();
    } */
  })();

  /* let bound = false;
  const _bind = () => {
    if (!bound) {
      bound = true;
    }
  };
  const _unbind = () => {
    if (bound) {
      bound = false;
    }
  }; */
  
  useCleanup(() => {
    live = false;
    localRenderSettings = null;
  });

  app.getRenderSettings = () => localRenderSettings;

  /* app.addEventListener('componentsupdate', e => {
    const {keys} = e;
    if (keys.includes('paused') || keys.includes('rendering')) {
      const renderable = _isRenderable();
      if (renderable) {
        _bind();
      } else {
        _unbind();
      }
    }
  }); */

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};