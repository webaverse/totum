const path = require('path');
const fs = require('fs');

const fillTemplate = function(templateString, templateVars) {
  return new Function("return `"+templateString +"`;").call(templateVars);
};
const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'glb.js'));
const cwd = process.cwd();

module.exports = {
  load(id) {
    if (id.startsWith(cwd)) {
      id = id.slice(cwd.length);
    }
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