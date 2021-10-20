const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'scn.js'), 'utf8');
const cwd = process.cwd();
console.log('cwd is',cwd);

module.exports = {
  load(id) {
    if(!id.startsWith('http:') && !id.startsWith('https:')){
      id = path.resolve(id);
      if (id.startsWith(cwd)) {
        id = id.slice(cwd.length);
      }
    }
    id = id.replaceAll('\\','/');
    console.log('got scn id', id);
    const code = fillTemplate(templateString, {
      srcUrl: id,
    });
    return {
      code,
      map: null,
    };
  },
};