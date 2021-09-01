const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const {fillTemplate} = require('../util.js');
const metaversefileLoader = require('./metaversefile.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'html.js'));
const cwd = process.cwd();

const _jsonParse = s => {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
};
const _resolveHtml = (id, importer) => {
  const code = fillTemplate(templateString, {
    srcUrl: id,
  });
  // console.log('got glb id', id);
  return {
    code,
    map: null,
  };
};

module.exports = {
  async resolveId(id, importer) {
    const oldId = id;
    if (id.startsWith(cwd)) {
      id = id.slice(cwd.length);
    }
    // console.log('load directory', oldId, id, /^https?:\/\//.test(id), /\/$/.test(id));
    if (/^https?:\/\//.test(id) && /\/$/.test(id)) {
      const metaversefilePath = id + '.metaversefile';
      const res = await fetch(metaversefilePath, {
        method: 'HEAD',
      });
      if (res.ok) {
        const metaversefileStartUrl = await metaversefileLoader.resolveId(metaversefilePath, id);
        // console.log('got metaversefile', {metaversefilePath, metaversefileStartUrl, id: id + '.fakeFile'});
        return metaversefileStartUrl;
      } else {
        // console.log('got html', id, importer);
        return null;
      }
    } else {
      return null;
    }
    /* const code = fillTemplate(templateString, {
      srcUrl: id,
    });
    // console.log('got glb id', id);
    return {
      code,
      map: null,
    }; */
  },
  load(id) {
    return _resolveHtml(id);
  }
};