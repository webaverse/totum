class Metaversefile extends EventTarget {
  constructor() {}
  setApi(o) {
    for (const k in o) {
      this[k] = o;
    }
    Object.freeze(this);
  }
}
const metaversefile = new Metaversefile();

export default metaversefile;