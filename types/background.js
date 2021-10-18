const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'background.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {
    if(!id.startsWith('http:') && !id.startsWith('https:')){
      id = path.resolve(id);
      if (id.startsWith(cwd)) {
        id = id.slice(cwd.length);
      }
    }
    id = id.replaceAll('\\','/');
    const code = fillTemplate(templateString, {
      srcUrl: id,
    });
     console.log('got bg id', id);
    return {
      code,
      map: null,
    };
  },
};