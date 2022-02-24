module.exports = function replaceImport(originalPath, callingFileName, options) {
  console.log(originalPath);
  if (originalPath === 'three' || originalPath.includes('three/examples')) {
    originalPath = `${process.env.MODULE_URL}three-proxy.js`;
  } else if (originalPath === 'metaversefile') {
    originalPath = originalPath.replace('metaversefile', `${process.env.MODULE_URL}metaversefile-proxy.js`);
  } else if (originalPath.includes('three-vrm')) {
    originalPath = `${process.env.MODULE_URL}three-vrm.js`;
  }
  return originalPath;
};
