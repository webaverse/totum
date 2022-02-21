import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLocalPlayer, useTextInternal} = metaversefile;

const Text = useTextInternal();
async function makeTextMesh(
  text = '',
  font = './assets/fonts/GeosansLight.ttf',
  fontSize = 1,
  anchorX = 'left',
  anchorY = 'middle',
  color = 0x000000,
) {
  const textMesh = new Text();
  textMesh.text = text;
  textMesh.font = font;
  textMesh.fontSize = fontSize;
  textMesh.color = color;
  textMesh.anchorX = anchorX;
  textMesh.anchorY = anchorY;
  textMesh.frustumCulled = false;
  await new Promise(accept => {
    textMesh.sync(accept);
  });
  return textMesh;
}

export default e => {
  const app = useApp();
  app.appType = 'text';
  app.text = null;
  
  const srcUrl = ${this.srcUrl};
  
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {text, font, fontSize, anchorX, anchorY, color} = j;
    const textMesh = await makeTextMesh(text, font, fontSize, anchorX, anchorY, color);
    app.add(textMesh);
    app.text = textMesh;
  })());

  return app;
};