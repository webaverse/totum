class XrNft extends EventTarget {
  constructor() {}
  setApi(o) {
    for (const k in o) {
      this[k] = o;
    }
    Object.freeze(this);
  }
}
const xrnft = new XrNft();

export default xrnft;