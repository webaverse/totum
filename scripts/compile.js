const path = require('path');
const esbuild = require('esbuild');
const metaversefilePlugin = require('../plugins/rollup.js');

// const testModuleUrl = `./metaverse_modules/target-reticle/`;

const metaversefilePluginInstance = metaversefilePlugin();
const metaversefilePluginProxy = {
  name: 'metaversefile',
  setup(build) {
    // metaversefilePluginInstance.setup(build);
    build.onResolve({filter: /^/}, async args => {
      console.log('onResolve 1', args);
      const p = await metaversefilePluginInstance.resolveId(args.path, args.importer);
      console.log('onResolve 2', {p});
      return {
        path: p,
      };
    });
    build.onLoad({filter: /^/}, async args => {
      console.log('onLoad 1', args);
      let c = await metaversefilePluginInstance.load(args.path);
      console.log('onLoad 2', {c});
      c = c.code;
      return {
        contents: c,
      };
    });
  },
};

async function compile(moduleUrl) {
  const b = await esbuild.build({
    entryPoints: [
      moduleUrl,
    ],
    // bundle: true,
    // outfile: 'out.js',
    plugins: [
      metaversefilePluginProxy,
    ],
    // loader: { '.png': 'binary' },
  });
  // console.log('got build result', b);
  return b;
}
module.exports = compile;

// check if start script
if (require.main === module) {
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