const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'gif.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {

    id = createRelativeFromAbsolutePath(id);
    
    const code = fillTemplate(templateString, {
      srcUrl: JSON.stringify(id),
    });
    // console.log('got glb id', id);
    return {
      code,
      map: null,
    };
  },
};