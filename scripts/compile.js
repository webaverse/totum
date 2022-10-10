// const path = require('path');
import esbuild from 'esbuild';
import metaversefilePlugin from '../plugins/rollup.js';

// const testModuleUrl = `./metaverse_modules/target-reticle/`;

const metaversefilePluginInstance = metaversefilePlugin();
const metaversefilePluginProxy = {
  name: 'metaversefile',
  setup(build) {
    // metaversefilePluginInstance.setup(build);
    build.onResolve({filter: /^/}, async args => {
      // console.log('onResolve 1', args);
      const p = await metaversefilePluginInstance.resolveId(args.path, args.importer);
      // console.log('onResolve 2', {p});
      return {
        path: p,
        namespace: 'metaversefile',
      };
    });
    build.onLoad({filter: /^/}, async args => {
      // console.log('onLoad 1', args);
      let c = await metaversefilePluginInstance.load(args.path);
      // console.log('onLoad 2', {c});
      c = c.code;
      return {
        contents: c,
      };
    });
  },
};

async function compile(moduleUrl) {
  const o = await esbuild.build({
    entryPoints: [
      moduleUrl,
    ],
    // bundle: true,
    // outfile: 'out.js',
    plugins: [
      metaversefilePluginProxy,
    ],
    // loader: { '.png': 'binary' },
    write: false,
    outdir: 'out',
  });
  if (o.outputFiles.length > 0) {
    return o.outputFiles[0].contents;
  } else if (o.errors.length > 0) {
    throw new Error(o.errors[0].text);
  } else {
    throw new Error('no output');
  }
  // console.log('got build result', b);
  // return b;
}
export default compile;

// check if start script
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const moduleUrl = process.argv[2];
    if (!moduleUrl) {
      throw new Error('no module url specified');
    }
    if (/^\.\.\//.test(moduleUrl)) {
      throw new Error('module url cannot be above current directory');
    }

    const b = await compile(moduleUrl);
    console.log(b);
  })();
}