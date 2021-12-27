const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'rendersettings.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {

    const _createRelativeFromAbsolutePath = path => {
      if (path.startsWith(cwd.replaceAll('\\','/'))) {
        path = path.slice(cwd.length);
      }
      return path;
    }

    id = _createRelativeFromAbsolutePath(id);
    
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