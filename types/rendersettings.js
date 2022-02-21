const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'rendersettings.js'), 'utf8');

module.exports = {
  load(id) {

    id = createRelativeFromAbsolutePath(id);
    
    const code = fillTemplate(templateString, {
      srcUrl: JSON.stringify(id),
    });
    return {
      code,
      map: null,
    };
  },
};