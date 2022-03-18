const path = require('path');
const fs = require('fs');
const {fillTemplate, parseIdHash} = require('../util.js');

const scnTemplateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'scn.js'), 'utf8');
// const cwd = process.cwd();

module.exports = {
  resolveId(source, importer) {
    return source;
  },
  async load(id) {
    console.log('weba load id', {id});
    id = id
      .replace(/^(weba:\/(?!\/))/, '$1/');
    
    const match = id.match(/^weba:\/\/([0-9\.]+)\/([0-9\.]+)(?:\/|$)/i);
    if (match) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const coords = [x, y];

      const sceneJson = {
        "objects": [
          {
            "position": [
              0,
              0,
              0
            ],
            "start_url": "../metaverse_modules/default-scene/",
            "components": [
              {
                "key": "coords",
                "value": coords
              }
            ]
          }
        ]
      };
      id = `data:application/scn,${JSON.stringify(sceneJson)}`;

      const {
        contentId,
        name,
        description,
        components,
      } = parseIdHash(id);

      const code = fillTemplate(scnTemplateString, {
        srcUrl: JSON.stringify(id),
        contentId: JSON.stringify(contentId),
        name: JSON.stringify(name),
        description: JSON.stringify(description),
        components: JSON.stringify(components),
      });

      return {
        code,
        map: null,
      };
    } else {
      return null;
    }
  },
};