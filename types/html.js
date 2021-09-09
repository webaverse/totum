const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'html.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {
    if (id.startsWith(cwd)) {
      id = id.slice(cwd.length);
    }
    // console.log('load html', id, JSON.stringify(templateString, null, 2));
    const code = fillTemplate(templateString, {
      srcUrl: id,
    });
    // console.log('got glb id', id);
    return {
      code,
      map: null,
    };
  },
};