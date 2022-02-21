const path = require('path');
const fs = require('fs');
const {jsonParse, fillTemplate, createRelativeFromAbsolutePath} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'html.js'), 'utf8');

module.exports = {
  load(id) {
    id = createRelativeFromAbsolutePath(id);

    let components = [];
    (() => {
      const match = id.match(/#([\s\S]+)$/);
      if (match) {
        const q = new URLSearchParams(match[1]);
        const qComponents = q.get('components');
        if (qComponents !== undefined) {
          components = jsonParse(qComponents) ?? [];
        }
      }
    })();

    // console.log('load html', id, JSON.stringify(templateString, null, 2));
    const code = fillTemplate(templateString, {
      srcUrl: JSON.stringify(id),
      components: JSON.stringify(components),
    });
    return {
      code,
      map: null,
    };
  },
};