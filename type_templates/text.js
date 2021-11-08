import * as THREE from 'three';
import {Text} from 'troika-three-text';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLocalPlayer} = metaversefile;

function makeTextMesh(
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
  textMesh.sync();
  return textMesh;
}

export default e => {
  const app = useApp();
  app.appType = 'text';
  
  const srcUrl = '${this.srcUrl}';
  
  (async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {text, font, fontSize, anchorX, anchorY, color} = j;
    const textMesh = makeTextMesh(text, font, fontSize, anchorX, anchorY, color);
    app.add(textMesh);
  })();

  return app;
};