import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useLocalPlayer, usePhysics, useLoaders, useActivate, useRigManagerInternal, useAvatarInternal} = metaversefile;

const wearableScale = 1;

const localVector = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();

export default e => {
  const app = useApp();
  const root = app;
  
  const physics = usePhysics();
  const rigManager = useRigManagerInternal();
  const Avatar = useAvatarInternal();

  const srcUrl = '${this.srcUrl}';
  const components = (
    ${this.components}
  );
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }
  // console.log('GLTF components', components);
  let glb = null;
  const animationMixers = [];
  const uvScrolls = [];
  const physicsIds = [];
  const staticPhysicsIds = [];
  let wearSpec = null;
  let modelBones = null;
  let activateCb = null;
  e.waitUntil((async () => {
    let o;
    try {
      o = await new Promise((accept, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(srcUrl, accept, function onprogress() {}, reject);
      });
    } catch(err) {
      console.warn(err);
    }
    // console.log('got o', o);
    if (o) {
      glb = o;
      const {parser, animations} = o;
      o = o.scene;
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
        /* if (!components.some(c => ['sit', 'pet', 'npc'].includes(c.type))) {
          _loadAnimations();
        } */
        _loadAnimations();

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

      /* const gltfObject = (() => {
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
      })(); */
      
      root.add(o);
      
      const _addPhysics = async () => {
        const mesh = o;
        
        let physicsMesh = null;
        let physicsBuffer = null;
        /* if (physics_url) {
          if (files && _isResolvableUrl(physics_url)) {
            physics_url = files[_dotifyUrl(physics_url)];
          }
          const res = await fetch(physics_url);
          const arrayBuffer = await res.arrayBuffer();
          physicsBuffer = new Uint8Array(arrayBuffer);
        } else { */
          mesh.updateMatrixWorld();
          physicsMesh = physics.convertMeshToPhysicsMesh(mesh);
          physicsMesh.position.copy(mesh.position);
          physicsMesh.quaternion.copy(mesh.quaternion);
          physicsMesh.scale.copy(mesh.scale);
        // }
        
        if (physicsMesh) {
          root.add(physicsMesh);
          const physicsId = physics.addGeometry(physicsMesh);
          root.remove(physicsMesh);
          physicsIds.push(physicsId);
          staticPhysicsIds.push(physicsId);
        }
        if (physicsBuffer) {
          const physicsId = physics.addCookedGeometry(physicsBuffer, mesh.position, mesh.quaternion, mesh.scale);
          physicsIds.push(physicsId);
          staticPhysicsIds.push(physicsId);
        }
        /* for (const componentType of runComponentTypes) {
          const componentIndex = components.findIndex(component => component.type === componentType);
          if (componentIndex !== -1) {
            const component = components[componentIndex];
            const componentHandler = componentHandlers[component.type];
            const unloadFn = componentHandler.run(mesh, componentIndex);
            componentUnloadFns.push(unloadFn);
          }
        } */
      };
      if (app.getComponent('physics')) {
        _addPhysics();
      }
      
      o.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false;
        }
      });
      
      activateCb = () => {
        wearSpec = app.getComponent('wear');
        // console.log('activate component', app, wear);
        if (wearSpec) {
          // const {app, wearSpec} = e.data;
          // console.log('got wear spec', [wearSpec.skinnedMesh, app.glb]);
          if (wearSpec.skinnedMesh && glb) {
            let skinnedMesh = null;
            glb.scene.traverse(o => {
              /* if (o.isSkinnedMesh) {
                console.log('check skinned mesh', [o.name, wearSpec.skinnedMesh]);
              } */
              if (skinnedMesh === null && o.isSkinnedMesh && o.name === wearSpec.skinnedMesh) {
                skinnedMesh = o;
              }
            });
            if (skinnedMesh && rigManager.localRig) {
              // console.log('got skinned mesh', skinnedMesh, rigManager?.localRig?.skeleton);
              // skinnedMesh.bind(rigManager.localRig.skeleton);
              // skinnedMesh.bindMode = 'detached';
              app.position.set(0, 0, 0);
              app.quaternion.identity(); //.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
              app.scale.set(1, 1, 1).multiplyScalar(wearableScale);
              app.updateMatrix();
              app.matrixWorld.copy(app.matrix);
              const {
                modelBones,
              } = Avatar.bindAvatar(glb.scene);

              // skeleton = skinnedMesh.skeleton;
              modelBones = modelBones;
            }
          }
          
          const localPlayer = useLocalPlayer();
          localPlayer.wear(app);
        }
      };
    }
  })());
  
  useFrame(({timestamp}) => {
    // const now = Date.now();
    const _updateAnimations = () => {
      for (const mixer of animationMixers) {
        mixer.update(timestamp);
      }
    };
    _updateAnimations();
    
    const _updateUvScroll = () => {
      for (const uvScroll of uvScrolls) {
        uvScroll.update(timestamp);
      }
    };
    _updateUvScroll();
    
    const _copyBoneAttachment = spec => {
      const {boneAttachment = 'hips', position, quaternion, scale} = spec;
      const {outputs} = rigManager.localRig;
      const bone = outputs[boneAttachment];
      if (bone) {
        bone.getWorldPosition(app.position);
        bone.getWorldQuaternion(app.quaternion);
        bone.getWorldScale(app.scale);
        if (Array.isArray(position)) {
          app.position.add(localVector.fromArray(position).applyQuaternion(app.quaternion));
        }
        if (Array.isArray(quaternion)) {
          app.quaternion.multiply(localQuaternion.fromArray(quaternion));
        }
        if (Array.isArray(scale)) {
          app.scale.multiply(localVector.fromArray(scale));
        }
      } else {
        console.warn('invalid bone attachment', {app, boneAttachment});
      }
    };
    const _updateWear = () => {
      if (wearSpec && rigManager.localRig) {
        const {instanceId} = app;
        const localPlayer = useLocalPlayer();
        const appUseAction = localPlayer.actions.find(action => action.type === 'use' && action.instanceId === instanceId);
        if (appUseAction && appUseAction.boneAttachment && wearSpec.boneAttachment) {
          _copyBoneAttachment(appUseAction);
        } else {
          if (modelBones) {
            Avatar.applyModelBoneOutputs(modelBones, rigManager.localRig.modelBoneOutputs, rigManager.localRig.getTopEnabled(), rigManager.localRig.getBottomEnabled(), rigManager.localRig.getHandEnabled(0), rigManager.localRig.getHandEnabled(1));
            modelBones.Hips.position.divideScalar(wearableScale);
            modelBones.Hips.updateMatrixWorld();
          } else if (wearSpec.boneAttachment) {
            _copyBoneAttachment(wearSpec);
          }
        }
      }
    };
    _updateWear();
  });
  
  useActivate(() => {
    activateCb && activateCb();
  });
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });
  
  return root;
};