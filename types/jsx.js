import path from 'path';
import fs from 'fs';
import url from 'url';
import Babel from '@babel/core';
import fetch from 'node-fetch';
import dataUrls from 'data-urls';
import {parseIdHash} from '../util.js';

const textDecoder = new TextDecoder();
const cwd = process.cwd();

export default {
  async resolveId(source, importer) {
    if (/^\.\//.test(source) && /^data:/.test(importer)) {
      return path.join(cwd, source);
    } else {
      return undefined;
    }
  },
  async load(id) {
    let src;
    if (/https?:/i.test(id)) {
      const o = url.parse(id, true);
      o.query['noimport'] = 1 + '';
      id = url.format(o);

      const res = await fetch(id);
      src = await res.text();
    } else if (/^data:/.test(id)) {
      const o = dataUrls(id);
      if (o) {
        const {/*mimeType, */body} = o;
        src = textDecoder.decode(body);
      } else {
        throw new Error('invalid data url');
      }
    } else {
      const p = id.replace(/#[\s\S]+$/, '');
      src = await fs.promises.readFile(p, 'utf8');
    }

    const {
      contentId,
      name,
      description,
      components,
    } = parseIdHash(id);
    
    const spec = Babel.transform(src, {
      presets: ['@babel/preset-react'],
      // compact: false,
    });
    let {code} = spec;

    code += `

export const contentId = ${JSON.stringify(contentId)};
export const name = ${JSON.stringify(name)};
export const description = ${JSON.stringify(description)};
export const type = 'js';
export const components = ${JSON.stringify(components)};
`;
    return {
      code,
      map: null,
    };
  },
};
