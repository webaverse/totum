import metaversefile from 'metaversefile';
const { useApp, useCleanup, useDomain } = metaversefile;

export default e => {
  const app = useApp();
  const domain = useDomain();
  const srcUrl = ${ this.srcUrl };
  let json = null;

  const mode = app.getComponent('mode') ?? 'attached';
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      json = await res.json();
      if (json && json.domain) {
        domain.connect(json.domain);
      } else {
        console.warn("Invalid Vircadia spec:", json);
      }
    })();
  }

  useCleanup(() => {
    domain.disconnect();
  });

  return app;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const type = 'domain';
export const components = ${ this.components };
