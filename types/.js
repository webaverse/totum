const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const {cwd, fillTemplate} = require('../util.js');
const totumLoader = require('./totum.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'html.js'));

/* const _jsonParse = s => {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
}; */
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
      const totumPath = id + '.totum';
      const res = await fetch(totumPath, {
        method: 'HEAD',
      });
      if (res.ok) {
        const totumStartUrl = await totumLoader.resolveId(totumPath, id);
        // console.log('got totum', {totumPath, totumStartUrl, id: id + '.fakeFile'});
        return totumStartUrl;
      } else {
        // console.log('got html', id, importer);
        
        const indexHtmlPath = id + 'index.html';
        const res = await fetch(indexHtmlPath, {
          method: 'HEAD',
        });
        if (res.ok) {
          return indexHtmlPath;
        } else {
          return null;
        }
      }
    } else if (/^\//.test(id)) {
      // console.log('got pre id 1', {id});
      id = path.resolve(id);
      const idFullPath = path.join(cwd, id);
      const isDirectory = await new Promise((accept, reject) => {
        fs.lstat(idFullPath, (err, stats) => {
          accept(!err && stats.isDirectory());
        });
      });
      if (isDirectory) {
        const totumPath = path.join(id, '.totum');
        const totumFullPath = path.join(cwd, totumPath);
        const totumExists = await new Promise((accept, reject) => {
          fs.lstat(totumFullPath, (err, stats) => {
            accept(!err && stats.isFile());
          });
        });
        // console.log('got pre id 2', {id, totumPath, totumFullPath, totumExists});
        if (totumExists) {
          const fakeImporter = path.join(id, '.fakeFile');
          const fakeId = path.join(path.dirname(fakeImporter), '.totum');
          // console.log('exists 1.1', {totumPath, fakeId, fakeImporter});
          const totumStartUrl = await totumLoader.resolveId(fakeId, fakeImporter);
          // console.log('exists 1.2', {totumPath, totumStartUrl});
          // console.log('got totum', {totumPath, totumStartUrl, id: id + '.fakeFile'});
          return totumStartUrl;
        } else {
          // console.log('exists 2');
          
          const indexHtmlPath = path.join(id, 'index.html');
          const indexHtmlFullPath = path.join(cwd, indexHtmlPath);
          const indexHtmlExists = await new Promise((accept, reject) => {
            fs.lstat(indexHtmlFullPath, (err, stats) => {
              accept(!err && stats.isFile());
            });
          });

          if (indexHtmlExists) {
            // console.log('exists 3', {indexHtmlPath});
            return indexHtmlPath;
          } else {
            // console.log('exists 4');
            return null;
          }
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  },
  load(id) {
    if (id === '/@react-refresh') {
      return null;
    } else {
      id = id.replace(/^\/@proxy\//, '');
      return _resolveHtml(id);
    }
  }
};
