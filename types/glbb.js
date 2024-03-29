import path from 'path';
import fs from 'fs';
import {fillTemplate, createRelativeFromAbsolutePath, parseIdHash} from '../util.js';

const dirname = path.dirname(import.meta.url.replace(/^[a-z]+:\/\//, ''));
const templateString = fs.readFileSync(path.join(dirname, '..', 'type_templates', 'glbb.js'), 'utf8');
// const cwd = process.cwd();

export default {
  load(id) {
    
    id = createRelativeFromAbsolutePath(id);

    const {
      contentId,
      name,
      description,
      components,
    } = parseIdHash(id);

    const code = fillTemplate(templateString, {
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
  },
};