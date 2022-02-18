const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'rendersettings.js'), 'utf8');
// const cwd = process.cwd();

module.exports = {
  load(id) {

    id = createRelativeFromAbsolutePath(id);
    
    const code = fillTemplate(templateString, {
      srcUrl: id,
    });
    // console.log('got image id', id);
    return {
      code,
      map: null,
    };
  },
};