module.exports = function replaceImport(originalPath, callingFileName, options) {
  console.log(originalPath);
  if (originalPath === 'three' || originalPath.includes('three/examples')) {
    originalPath = originalPath.replace('three', `${process.env.MODULE_URL}three.js`);
  } else if (originalPath === 'metaversefile') {
    originalPath = originalPath.replace('metaversefile', `${process.env.MODULE_URL}metaversefile.js`);
  } else if (originalPath.includes('three-vrm')) {
    originalPath = `${process.env.MODULE_URL}three-vrm.js`;
  }
  return originalPath;
};
