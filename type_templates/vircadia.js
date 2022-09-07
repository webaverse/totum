import metaversefile from 'metaversefile';
const { useApp, useCleanup, /* connectDomain, disconnectDoomain */ } = metaversefile;

export default e => {
  const app = useApp();
  const srcUrl = ${ this.srcUrl };
  let json = null;

  const mode = app.getComponent('mode') ?? 'attached';
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      json = await res.json();
      if (json && json.domain) {
        console.debug("connectDomain():", json.domain);
        //connectDomain(json.domain);
      } else {
        console.warn("Invalid Vircadia spec:", json);
      }
    })();
  }

  useCleanup(() => {
    console.debug("disconnectDomain()");
    //disconnectDoomain();
  });

  return app;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const type = 'domain';
export const components = ${ this.components };
