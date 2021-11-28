import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, useScene, usePhysics, useInternals, useJSON6Internal, useCleanup} = metaversefile;

const {renderer} = useInternals();
const JSON6 = useJSON6Internal();
const geometry = new THREE.PlaneBufferGeometry(2, 2);

export default e => {
  const app = useApp();
  app.appType = 'gltj';

  const srcUrl = '${this.srcUrl}';

  let _update = null;
  e.waitUntil((async () => {
      const res = await fetch(srcUrl);
      const s = await res.text();
      const j = JSON6.parse(s);

      const material = new THREE.ShaderMaterial(j);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      app.add(mesh);

      const uniforms = app.getComponent("uniforms");
      for (const name in uniforms) {
        material.uniforms[name].value = uniforms[name];
      }

      let now = 0;
      _update = (timestamp, timeDiff) => {
        if (material.uniforms.iTime) {
          material.uniforms.iTime.value = now/1000;
          material.uniforms.iTime.needsUpdate = true;
        }
        if(material.uniforms.iTimeS) {
          material.uniforms.iTimeS.value = timestamp/1000;
          material.uniforms.iTimeS.needsUpdate = true;
        }
        if (material.uniforms.iResolution) {
          if (!material.uniforms.iResolution.value) {
            material.uniforms.iResolution.value = new THREE.Vector2();
          }
          renderer.getSize(material.uniforms.iResolution.value)
            .multiplyScalar(renderer.getPixelRatio());
          material.uniforms.iResolution.needsUpdate = true;
        }

        now += timeDiff;
      };
    })());

  useFrame(({timestamp, timeDiff}) => {
    _update && _update(timestamp, timeDiff);
  });

  return app;
};