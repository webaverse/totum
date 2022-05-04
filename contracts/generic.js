
// import * as ethers from 'ethers';
const ethers = require('ethers');
const path = require('path');
const fs = require('fs');
const {fillTemplate, parseIdHash} = require('../util.js');
const fetch = require('node-fetch');

const infuraProjectId = 'f6d37ed423e143feb2b0a331e7899aaf';
const templateString = fs.readFileSync(path.join(__dirname, '..', 'type_templates', 'image.js'), 'utf8');
// const cwd = process.cwd();

module.exports = {
  resolveId(source, importer) {
    return source;
    /* console.log('cv resolve id', {source, importer});
    return '/@proxy/' + source; */
  },
  async load(id) {
    // console.log('cv load id', {id});
    id = id
      .replace(/^(eth?:\/(?!\/))/, '$1/');
    
    const match = id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/i);
    if (match) {
      const contractAddress = match[1];
      const tokenId = parseInt(match[2], 10);

      const {
        contentId,
        name,
        description,
        components,
      } = parseIdHash(id);

      const provider = new ethers.providers.InfuraProvider('homestead', {
          projectId: infuraProjectId,
          // projectSecret: infuraProjectSecret
      });

      const abi = [
          "function tokenURI(uint256 _tokenId) public view returns (string)"
      ];
      const contract = new ethers.Contract( contractAddress, abi, provider );
      const uri = await contract.tokenURI( tokenId );

      const request = await fetch( uri );
      const data = await request.json();

      const code = fillTemplate(templateString, {
        // contractAddress,
        // tokenId,
        // contentId,
        srcUrl: JSON.stringify( data.image ),
        contentId: JSON.stringify(contentId),
        name,
        description: null,
        components: '[]',
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