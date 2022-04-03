import metaversefile from 'metaversefile';
const {createRedirect} = metaversefile;

export default e => {
  const srcUrl = ${this.srcUrl};

  return createRedirect({
    src: srcUrl,
  });
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};