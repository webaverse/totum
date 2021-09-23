const path = require('path');
const fs = require('fs');
const {fillTemplate} = require('../util.js');

const templateString = fs.readFileSync(path.join(__dirname, '..', 'contract_templates', 'loomlock.js'), 'utf8');
const cwd = process.cwd();

module.exports = {
  resolveId(source, importer) {
    return source;
  },
  load(id) {
    console.log('loomlock load id', {id});
    id = id
      .replace(/^(eth?:\/(?!\/))/, '$1/');
    
    const match = id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/i);
    if (match) {
      const contractAddress = match[1];
      const tokenId = parseInt(match[2], 10);
      // fs.writeFileSync('./dump.txt', templateString);
      const code = fillTemplate(templateString, {
        contractAddress,
        tokenId,
      });
      // console.log('got glb id', id);
      return {
        code,
        map: null,
      };
    } else {
      return null;
    }
  },
};