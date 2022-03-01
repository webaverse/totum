const path = require('path');
const proxy = '-proxy';

module.exports = function replaceImport(originalPath, callingFileName, options) {
  /** remove extension to normalise the path */

  if (originalPath === 'three') {
    originalPath = `${process.env.MODULE_URL}three${proxy}.js`;
  } else if (originalPath.includes('three/examples')) {
    originalPath = `${process.env.MODULE_URL}${originalPath}.js`;
  } else if (originalPath === 'metaversefile') {
    originalPath = originalPath.replace('metaversefile', `${process.env.MODULE_URL}metaversefile${proxy}.js`);
  } else if (originalPath.includes('three-vrm')) {
    originalPath = `${process.env.MODULE_URL}three-vrm${proxy}.js`;
  }

  const ext = path.parse(originalPath).ext;
  if (ext) {
    /** remove double extension from path */
    originalPath = originalPath.replace(ext+ext, ext);
  }

  return originalPath;
};
