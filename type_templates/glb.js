import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useLocalPlayer, usePhysics, useLoaders, useActivate, useRigManagerInternal, useAvatarInternal} = metaversefile;

const wearableScale = 1;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

const z180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

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
  
  let petSpec = null;
  let petMixer = null;
  let idleAction = null;
  let walkAction = null;
  let runAction = null;
  let rootBone = null;
  
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

                /* let lastTimestamp = Date.now();
                const update = now => {
                  const timeDiff = now - lastTimestamp;
                  const deltaSeconds = timeDiff / 1000;
                  mixer.update(deltaSeconds);
                  lastTimestamp = now;
                }; */

                animationMixers.push({
                  update(deltaSeconds) {
                    mixer.update(deltaSeconds);
                  },
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
              const bindSpec = Avatar.bindAvatar(glb);

              // skeleton = bindSpec.skeleton;
              modelBones = bindSpec.modelBones;
            }
          }
          
          const localPlayer = useLocalPlayer();
          localPlayer.wear(app);
        }
        
        petSpec = app.getComponent('pet');
        if (petSpec && glb) {
          let mesh = null;
          glb.scene.traverse(o => {
            if (mesh === null && o.isMesh) {
              mesh = o;
            }
          });
          if (mesh) {
            petMixer = new THREE.AnimationMixer(mesh);
            
            // console.log('got animations', petSpec, animations);
            // debugger;
            const idleAnimation = petSpec.idleAnimation ? animations.find(a => a.name === petSpec.idleAnimation) : null;
            if (idleAnimation) {
              idleAction = petMixer.clipAction(idleAnimation);
              idleAction.play();
            }
            const walkAnimation = petSpec.walkAnimation ? animations.find(a => a.name === petSpec.walkAnimation) : null;
            if (walkAnimation) {
              walkAction = petMixer.clipAction(walkAnimation);
              walkAction.play();
            }
            const runAnimation = petSpec.runAnimation ? animations.find(a => a.name === petSpec.runAnimation) : null;
            if (runAnimation) {
              runAction = petMixer.clipAction(runAnimation);
              runAction.play();
            }
          }
        }
      };
    }
  })());
  
  const smoothVelocity = new THREE.Vector3();
  const lastLookQuaternion = new THREE.Quaternion();
  const _getAppDistance = () => {
    const localPlayer = useLocalPlayer();
    const position = localVector.copy(localPlayer.position);
    position.y = 0;
    const distance = app.position.distanceTo(position);
    return distance;
  };
  const minDistance = 1;
  const _isFar = distance => (distance - minDistance) > 0.01;
  useFrame(({timestamp, timeDiff}) => {
    // components
    const _updatePet = () => {
      if (!!app.getComponent('pet')) {
        if (rootBone) {
          rootBone.quaternion.copy(rootBone.originalQuaternion);
        }
        
        if (petMixer) {
          const speed = 0.0014;

          const distance = _getAppDistance();
          const moveDelta = localVector;
          moveDelta.setScalar(0);
          if (_isFar(distance)) { // handle rounding errors
            // console.log('distance', distance, minDistance);
            const localPlayer = useLocalPlayer();
            const position = localPlayer.position.clone();
            position.y = 0;
            const direction = position.clone()
              .sub(app.position)
              .normalize();
            const maxMoveDistance = distance - minDistance;
            const moveDistance = Math.min(speed * timeDiff, maxMoveDistance);
            moveDelta.copy(direction)
              .multiplyScalar(moveDistance);
            app.position.add(moveDelta);
            app.quaternion.slerp(localQuaternion.setFromUnitVectors(localVector2.set(0, 0, 1), direction), 0.1);
          } else {
            /* // console.log('check', head === drop, component.attractedTo === 'fruit', typeof component.eatSpeed === 'number');
            if (head === drop && component.attractedTo === 'fruit' && typeof component.eatSpeed === 'number') {
              drop.scale.subScalar(1/component.eatSpeed*timeDiff);
              // console.log('new scale', drop.scale.toArray());
              if (drop.scale.x <= 0 || drop.scale.y <= 0 || drop.scale.z <= 0) {
                dropManager.removeDrop(drop);
              }
            } */
          }
          smoothVelocity.lerp(moveDelta, 0.3);
          
          const walkSpeed = 0.01;
          const runSpeed = 0.03;
          const currentSpeed = smoothVelocity.length();
          if (walkAction) {
            walkAction.weight = Math.min(currentSpeed / walkSpeed, 1);
          }
          if (runAction) {
            runAction.weight = Math.min(Math.max((currentSpeed - walkSpeed) / (runSpeed - walkSpeed), 0), 1);
          }
          if (idleAction) {
            idleAction.weight = 1 - Math.min(currentSpeed / walkSpeed, 1);
          }

          const deltaSeconds = timeDiff / 1000;
          petMixer.update(deltaSeconds);
        }
      } else {
        const deltaSeconds = timeDiff / 1000;
        for (const mixer of animationMixers) {
          mixer.update(deltaSeconds);
        }
      }
    };
    _updatePet();
    
    const _updateLook = () => {
      const lookComponent = app.getComponent('look');
      if (lookComponent && glb) {
        let skinnedMesh = null;
        glb.scene.traverse(o => {
          if (skinnedMesh === null && o.isSkinnedMesh) {
            skinnedMesh = o;
          }
        });
        if (skinnedMesh) {
          const bone = skinnedMesh.skeleton.bones.find(bone => bone.name === lookComponent.rootBone);
          if (bone) {
            rootBone = bone;
            if (!bone.originalQuaternion) {
              bone.originalQuaternion = bone.quaternion.clone();
            }
            
            if (!bone.quaternion.equals(lastLookQuaternion)) {
              const localPlayer = useLocalPlayer();
              const {position, quaternion} = localPlayer;
              localQuaternion2.setFromRotationMatrix(
                localMatrix.lookAt(
                  position,
                  bone.getWorldPosition(localVector),
                  localVector2.set(0, 1, 0)
                    // .applyQuaternion(bone.getWorldQuaternion(localQuaternion))
                )
              ).premultiply(localQuaternion.copy(app.quaternion).invert());
              localEuler.setFromQuaternion(localQuaternion2, 'YXZ');
              localEuler.y = Math.min(Math.max(localEuler.y, -Math.PI*0.5), Math.PI*0.5);
              localQuaternion2.setFromEuler(localEuler)
                .premultiply(app.quaternion);
              
              bone.matrixWorld.decompose(localVector, localQuaternion, localVector2);
              localQuaternion.copy(localQuaternion2)
                .multiply(localQuaternion3.copy(bone.originalQuaternion).invert())
                .normalize();
              bone.matrixWorld.compose(localVector, localQuaternion, localVector2);
              bone.matrix.copy(bone.matrixWorld)
                .premultiply(localMatrix.copy(bone.parent.matrixWorld).invert())
                .decompose(bone.position, bone.quaternion, bone.scale);
              
              lastLookQuaternion.copy(bone.quaternion);
            }
          }
        }
      }
    };
    _updateLook();
    
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
    
    
    // standards
    const _updateUvScroll = () => {
      for (const uvScroll of uvScrolls) {
        uvScroll.update(timestamp);
      }
    };
    _updateUvScroll();
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