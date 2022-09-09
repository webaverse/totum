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
        if (domain.hasContext()) {
          if (!domain.hasURL()) {
            domain.connect(json.domain);
          } else {
            console.warn('Tried to use more than one Vircadia domain in a scene.');
          }
        } else {
          console.warn('Tried to use Vircadia domain in a non-domain scene.');
        }
      } else {
        console.warn("Invalid Vircadia spec:", json);
      }
    })();
  }

  useCleanup(() => {
    // Don't need to call domain.disconnect() here because domain will have already been disconnected by 
    // universe.disconnectDomain().
  });

  return app;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const type = 'domain';
export const components = ${ this.components };
