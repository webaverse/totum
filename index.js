class Metaversefile extends EventTarget {
  constructor() {
    super();
  }
  setApi(o) {
    for (const k in o) {
      this[k] = o[k];
    }
    Object.freeze(this);
  }
}
const metaversefile = new Metaversefile();

export default metaversefile;