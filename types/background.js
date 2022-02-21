const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'background.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {
    
    id = createRelativeFromAbsolutePath(id);

    const code = fillTemplate(templateString, {
      srcUrl: JSON.stringify(id),
    });
    // console.log('got image id', id);
    return {
      code,
      map: null,
    };
  },
};