// const {resolveFileFromId} = require('../util.js');

const fillTemplate = function(templateString, templateVars) {
  return new Function("return `"+templateString +"`;").call(templateVars);
};
const templateString = `\
  import * as THREE from 'three';

  const srcUrl = '\${this.srcUrl}';

  let o;
  try {
    o = await new Promise((accept, reject) => {
      gltfLoader.load(srcUrl, accept, function onprogress() {}, reject);
    });
    // startMonetization(instanceId, monetizationPointer, ownerAddress);
  } catch(err) {
    console.warn(err);
  } /* finally {
    if (/^blob:/.test(srcUrl)) {
      gcFiles && URL.revokeObjectURL(srcUrl);
    }
  } */
  const {parser, animations} = o;
  o = o.scene;
  const animationMixers = [];
  const uvScrolls = [];
  const _loadHubsComponents = () => {
    const _loadAnimations = () => {
      o.traverse(o => {
        if (o.isMesh) {
          const idleAnimation = animations.find(a => a.name === 'idle');
          let clip = idleAnimation || animations[animationMixers.length];
          if (clip) {
            const mesh = o;
            const mixer = new THREE.AnimationMixer(mesh);
            
            const action = mixer.clipAction(clip);
            action.play();

            let lastTimestamp = Date.now();
            const update = now => {
              const timeDiff = now - lastTimestamp;
              const deltaSeconds = timeDiff / 1000;
              mixer.update(deltaSeconds);
              lastTimestamp = now;
            };

            animationMixers.push({
              update,
            });
          }
        }
      });
    };
    if (!components.some(c => ['sit', 'pet', 'npc'].includes(c.type))) {
      _loadAnimations();
    }

    const _loadLightmaps = () => {
      const _loadLightmap = async (parser, materialIndex) => {
        const lightmapDef = parser.json.materials[materialIndex].extensions.MOZ_lightmap;
        const [material, lightMap] = await Promise.all([
          parser.getDependency("material", materialIndex),
          parser.getDependency("texture", lightmapDef.index)
        ]);
        material.lightMap = lightMap;
        material.lightMapIntensity = lightmapDef.intensity !== undefined ? lightmapDef.intensity : 1;
        material.needsUpdate = true;
        return lightMap;
      };
      if (parser.json.materials) {
        for (let i = 0; i < parser.json.materials.length; i++) {
          const materialNode = parser.json.materials[i];

          if (!materialNode.extensions) continue;

          if (materialNode.extensions.MOZ_lightmap) {
            _loadLightmap(parser, i);
          }
        }
      }
    };
    _loadLightmaps();
    
    const _loadUvScroll = o => {
      const textureToData = new Map();
      const registeredTextures = [];
      o.traverse(o => {
        if (o.isMesh && o?.userData?.gltfExtensions?.MOZ_hubs_components?.['uv-scroll']) {
          const uvScrollSpec = o.userData.gltfExtensions.MOZ_hubs_components['uv-scroll'];
          const {increment, speed} = uvScrollSpec;
          
          const mesh = o; // this.el.getObject3D("mesh") || this.el.getObject3D("skinnedmesh");
          const {material} = mesh;
          if (material) {
            const spec = {
              data: {
                increment,
                speed,
              },
            };

            // We store mesh here instead of the material directly because we end up swapping out the material in injectCustomShaderChunks.
            // We need material in the first place because of MobileStandardMaterial
            const instance = { component: spec, mesh };

            spec.instance = instance;
            spec.map = material.map || material.emissiveMap;

            if (spec.map && !textureToData.has(spec.map)) {
              textureToData.set(spec.map, {
                offset: new THREE.Vector2(),
                instances: [instance]
              });
              registeredTextures.push(spec.map);
            } else if (!spec.map) {
              console.warn("Ignoring uv-scroll added to mesh with no scrollable texture.");
            } else {
              console.warn(
                "Multiple uv-scroll instances added to objects sharing a texture, only the speed/increment from the first one will have any effect"
              );
              textureToData.get(spec.map).instances.push(instance);
            }
          }
          let lastTimestamp = Date.now();
          const update = now => {
            const dt = now - lastTimestamp;
            for (let i = 0; i < registeredTextures.length; i++) {
              const map = registeredTextures[i];
              const { offset, instances } = textureToData.get(map);
              const { component } = instances[0];

              offset.addScaledVector(component.data.speed, dt / 1000);

              offset.x = offset.x % 1.0;
              offset.y = offset.y % 1.0;

              const increment = component.data.increment;
              map.offset.x = increment.x ? offset.x - (offset.x % increment.x) : offset.x;
              map.offset.y = increment.y ? offset.y - (offset.y % increment.y) : offset.y;
            }
            lastTimestamp = now;
          };
          uvScrolls.push({
            update,
          });
        }
      });
    };
    _loadUvScroll(o);
  };
  _loadHubsComponents();

  const gltfObject = (() => {
    if (optimize) {
      const specs = [];
      o.traverse(o => {
        if (o.isMesh) {
          const mesh = o;
          const {geometry} = o;
          let texture;
          if (o.material.map) {
            texture = o.material.map;
          } else if (o.material.emissiveMap) {
            texture = o.material.emissiveMap;
          } else {
            texture = null;
          }
          specs.push({
            mesh,
            geometry,
            texture,
          });
        }
      });
      specs.sort((a, b) => +a.mesh.material.transparent - +b.mesh.material.transparent);
      const meshes = specs.map(spec => spec.mesh);
      const geometries = specs.map(spec => spec.geometry);
      const textures = specs.map(spec => spec.texture);

      const mesh = mergeMeshes(meshes, geometries, textures);
      mesh.userData.gltfExtensions = {
        EXT_aabb: mesh.geometry.boundingBox.min.toArray()
          .concat(mesh.geometry.boundingBox.max.toArray()),
        // EXT_hash: hash,
      };
      return mesh;
    } else {
      return o;
    }
  })();
  
  useFrame(() => {
    const now = Date.now();
    const _updateAnimations = () => {
      for (const mixer of animationMixers) {
        mixer.update(now);
      }
    };
    _updateAnimations();
    const _updateUvScroll = () => {
      for (const uvScroll of uvScrolls) {
        uvScroll.update(now);
      }
    };
    _updateUvScroll();
  });
`;

module.exports = {
  load(id) {
    const code = fillTemplate(templateString, {
      srcUrl: id,
    });
    console.log('got glb id', id, code);
    return {
      code,
      map: null,
    };
  },
};