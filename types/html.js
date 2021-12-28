const path = require('path');
const fs = require('fs');
const {fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'html.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  load(id) {

    id = createRelativeFromAbsolutePath(id);

    const components = (() => {
      const match = id.match(/#([\s\S]+)$/);
      if (match) {
        const q = parseQuery(match[1]);
        return q.components !== undefined ? JSON.parse(q.components) : [];
      } else {
        return [];
      }
    })();
    // console.log('load html', id, JSON.stringify(templateString, null, 2));
    const code = fillTemplate(templateString, {
      srcUrl: id,
      components: JSON.stringify(components),
    });
    // console.log('got glb id', id);
    return {
      code,
      map: null,
    };
  },
};