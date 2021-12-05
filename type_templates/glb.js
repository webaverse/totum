import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useLocalPlayer, usePhysics, useLoaders, useActivate, useAvatarInternal, useInternals, getSpeed} = metaversefile;

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
  app.appType = 'glb';
  
  const root = app;
  
  const physics = usePhysics();
  const localPlayer = useLocalPlayer();
  const Avatar = useAvatarInternal();

  const srcUrl = '${this.srcUrl}';
  const components = (
    ${this.components}
  );
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }
  
  let glb = null;
  const animationMixers = [];
  const uvScrolls = [];
  const physicsIds = [];
  
  // glb state
  let animations;
  
  // wear
  let wearSpec = null;
  let modelBones = null;
  
  // pet state
  let petSpec = null;
  let petMixer = null;
  let idleAction = null;
  let walkAction = null;
  let runAction = null;
  let rootBone = null;
  
  // sit state
  let sitSpec = null;
  let rideAction = null;
  let mountMixer = null;
  let mountActions = [];
  
  const petComponent = app.getComponent('pet');
  const _makePetMixer = () => {
    let petMixer, idleAction;
    
    let firstMesh = null;
    glb.scene.traverse(o => {
      if (firstMesh === null && o.isMesh) {
        firstMesh = o;
      }
    });
    petMixer = new THREE.AnimationMixer(firstMesh);
    
    const idleAnimation = petComponent.idleAnimation ? animations.find(a => a.name === petComponent.idleAnimation) : null;
    if (idleAnimation) {
      idleAction = petMixer.clipAction(idleAnimation);
      idleAction.play();
    } else {
      idleAction = null;
    }
    
    return {
      petMixer,
      idleAction,
    };
  };

  const sitComponent = app.getComponent('sit');
  const _makeMountMixer = () => {
    let mountMixer;
    
    let firstMesh = null;
    glb.scene.traverse(o => {
      if (firstMesh === null && o.isMesh) {
        firstMesh = o;
      }
    });
    mountMixer = new THREE.AnimationMixer(firstMesh);

    return {
      mountMixer,
    };
  };
  
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
      const {parser} = o;
      animations = o.animations;
      // console.log('got animations', animations);
      o = o.scene;
      
      const _addAntialiasing = aaLevel => {
        o.traverse(o => {
          if (o.isMesh) {
            ['alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'map', 'metalnessMap', 'normalMap', 'roughnessMap'].forEach(mapType => {
              if (o.material[mapType]) {
                o.material[mapType].anisotropy = aaLevel;
              }
            });
          }
        });
      };
      _addAntialiasing(16);
      
      const _loadHubsComponents = () => {
        const _loadAnimations = () => {
          o.traverse(o => {
            if (o.isMesh) {
              const idleAnimation = animations.find(a => a.name === 'idle');
              let clip = idleAnimation || animations[animationMixers.length];
              if (clip) {
                const mixer = new THREE.AnimationMixer(o);
                const action = mixer.clipAction(clip);

                if(sitComponent) {
                  const disableLoop = sitComponent.disableLoop ? sitComponent.disableLoop : false;
                  const clamp = sitComponent.clampAnimationWhenFinished ? sitComponent.clampAnimationWhenFinished : false;

                  if(disableLoop) {
                    action.loop = THREE.LoopOnce; // Only plays once
                  }
                  if(clamp) {
                    action.clampWhenFinished = true;
                  }
                  mountActions.push(action);
                } 
                else {
                  action.play(); // If not sitComponent, auto-play actions
                }

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
                  clear() {
                    mixer.stopAllAction();
                  }
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
        // let physicsMesh = null;
        // let physicsBuffer = null;
        /* if (physics_url) {
          if (files && _isResolvableUrl(physics_url)) {
            physics_url = files[_dotifyUrl(physics_url)];
          }
          const res = await fetch(physics_url);
          const arrayBuffer = await res.arrayBuffer();
          physicsBuffer = new Uint8Array(arrayBuffer);
        } else { */
        // }
        
        // if (physicsMesh) {
          // root.add(physicsMesh);
          const physicsId = physics.addGeometry(o);
          // root.remove(physicsMesh);
          physicsIds.push(physicsId);
          // staticPhysicsIds.push(physicsId);
        // }
        /* if (physicsBuffer) {
          const physicsId = physics.addCookedGeometry(physicsBuffer, mesh.position, mesh.quaternion, mesh.scale);
          physicsIds.push(physicsId);
          staticPhysicsIds.push(physicsId);
        } */
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
      
      // const materials = new Set();
      o.traverse(o => {
        if (o.isMesh) {
          /* const {csm} = useInternals();
          if (!materials.has(o.material)) {
            materials.add(o.material);
            csm.setupMaterial(o.material);
          } */
          o.frustumCulled = false;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });      
      
      if (petComponent) { 
        const m = _makePetMixer();
        petMixer = m.petMixer;
        idleAction = m.idleAction;
      }

      if (sitComponent) {
        const m = _makeMountMixer();
        mountMixer = m.mountMixer;
      }
      
      activateCb = () => {
        if (
          app.getComponent('wear') ||
          app.getComponent('pet') ||
          app.getComponent('sit')
        ) {
          app.wear();
        }
      };
    }
  })());
  
  const _unwear = () => {
    if (wearSpec) {
      wearSpec = null;
      modelBones = null;
    }
    if (petSpec) {
      petSpec = null;
      petMixer.stopAllAction();
      walkAction = null;
      runAction = null;
      rootBone = null;
      
      const m = _makePetMixer();
      petMixer = m.petMixer;
      idleAction = m.idleAction;
    }
    if (sitSpec) {
      const sitAction = localPlayer.getAction('sit');
      if (sitAction) {
        localPlayer.removeAction('sit');
        sitSpec = null;
        for (const mixer of animationMixers) {
          mixer.clear();
        }
      }
    }
  };
  app.addEventListener('wearupdate', e => {
    if (e.wear) {
      const {animations} = glb;
      
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
          if (skinnedMesh && localPlayer.avatar) {
            // console.log('got skinned mesh', skinnedMesh, localPlayer.avatar);
            // skinnedMesh.bind(localPlayer.avatar.skeleton);
            // skinnedMesh.bindMode = 'detached';
            app.position.set(0, 0, 0);
            app.quaternion.identity(); //.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            app.scale.set(1, 1, 1)//.multiplyScalar(wearableScale);
            app.updateMatrix();
            app.matrixWorld.copy(app.matrix);
            
            // this adds pseudo-VRM onto our GLB assuming a mixamo rig
            // used for the glb wearable skinning feature
            const _mixamoRigToFakeVRMHack = () => {
              const {nodes} = glb.parser.json;
              const boneNodeMapping = {
                hips: 'J_Bip_C_Hips',
                leftUpperLeg: 'J_Bip_L_UpperLeg',
                rightUpperLeg: 'J_Bip_R_UpperLeg',
                leftLowerLeg: 'J_Bip_L_LowerLeg',
                rightLowerLeg: 'J_Bip_R_LowerLeg',
                leftFoot: 'J_Bip_L_Foot',
                rightFoot: 'J_Bip_R_Foot',
                spine: 'J_Bip_C_Spine',
                chest: 'J_Bip_C_Chest',
                neck: 'J_Bip_C_Neck',
                head: 'J_Bip_C_Head',
                leftShoulder: 'J_Bip_L_Shoulder',
                rightShoulder: 'J_Bip_R_Shoulder',
                leftUpperArm: 'J_Bip_L_UpperArm',
                rightUpperArm: 'J_Bip_R_UpperArm',
                leftLowerArm: 'J_Bip_L_LowerArm',
                rightLowerArm: 'J_Bip_R_LowerArm',
                leftHand: 'J_Bip_L_Hand',
                rightHand: 'J_Bip_R_Hand',
                leftToes: 'J_Bip_L_ToeBase',
                rightToes: 'J_Bip_R_ToeBase',
                leftEye: 'J_Adj_L_FaceEye',
                rightEye: 'J_Adj_R_FaceEye',
                leftThumbProximal: 'J_Bip_L_Thumb1',
                leftThumbIntermediate: 'J_Bip_L_Thumb2',
                leftThumbDistal: 'J_Bip_L_Thumb3',
                leftIndexProximal: 'J_Bip_L_Index1',
                leftIndexIntermediate: 'J_Bip_L_Index2',
                leftIndexDistal: 'J_Bip_L_Index3',
                leftMiddleProximal: 'J_Bip_L_Middle1',
                leftMiddleIntermediate: 'J_Bip_L_Middle2',
                leftMiddleDistal: 'J_Bip_L_Middle3',
                leftRingProximal: 'J_Bip_L_Ring1',
                leftRingIntermediate: 'J_Bip_L_Ring2',
                leftRingDistal: 'J_Bip_L_Ring3',
                leftLittleProximal: 'J_Bip_L_Little1',
                leftLittleIntermediate: 'J_Bip_L_Little2',
                leftLittleDistal: 'J_Bip_L_Little3',
                rightThumbProximal: 'J_Bip_R_Thumb1',
                rightThumbIntermediate: 'J_Bip_R_Thumb2',
                rightThumbDistal: 'J_Bip_R_Thumb3',
                rightIndexProximal: 'J_Bip_R_Index1',
                rightIndexIntermediate: 'J_Bip_R_Index2',
                rightIndexDistal: 'J_Bip_R_Index3',
                rightMiddleProximal: 'J_Bip_R_Middle3',
                rightMiddleIntermediate: 'J_Bip_R_Middle2',
                rightMiddleDistal: 'J_Bip_R_Middle1',
                rightRingProximal: 'J_Bip_R_Ring1',
                rightRingIntermediate: 'J_Bip_R_Ring2',
                rightRingDistal: 'J_Bip_R_Ring3',
                rightLittleProximal: 'J_Bip_R_Little1',
                rightLittleIntermediate: 'J_Bip_R_Little2',
                rightLittleDistal: 'J_Bip_R_Little3',
                upperChest: 'J_Bip_C_UpperChest',
              };
              const humanBones = [];
              for (const k in boneNodeMapping) {
                const boneName = boneNodeMapping[k];
                const boneNodeIndex = nodes.findIndex(node => node.name === boneName);
                if (boneNodeIndex !== -1) {
                  const boneSpec = {
                    bone: k,
                    node: boneNodeIndex,
                    // useDefaultValues: true, // needed?
                  };
                  humanBones.push(boneSpec);
                } else {
                  console.log('failed to find bone', boneNodeMapping, k, nodes, boneNodeIndex);
                }
              }
              if (!glb.parser.json.extensions) {
                glb.parser.json.extensions = {};
              }
              glb.parser.json.extensions.VRM = {
                humanoid: {
                  humanBones,
                },
              };
            };
            _mixamoRigToFakeVRMHack();
            const bindSpec = Avatar.bindAvatar(glb);

            // skeleton = bindSpec.skeleton;
            modelBones = bindSpec.modelBones;
          }
        }
        
        // app.wear();
      }
      
      petSpec = app.getComponent('pet');
      if (petSpec) {
        const walkAnimation = (petSpec.walkAnimation && petSpec.walkAnimation !== petSpec.idleAnimation) ? animations.find(a => a.name === petSpec.walkAnimation) : null;
        if (walkAnimation) {
          walkAction = petMixer.clipAction(walkAnimation);
          walkAction.play();
        }
        const runAnimation = (petSpec.runAnimation && petSpec.runAnimation !== petSpec.idleAnimation) ? animations.find(a => a.name === petSpec.runAnimation) : null;
        if (runAnimation) {
          runAction = petMixer.clipAction(runAnimation);
          runAction.play();
        }
      }

      sitSpec = app.getComponent('sit');
      if (sitSpec) {
        let rideMesh = null;
        glb.scene.traverse(o => {
          if (rideMesh === null && o.isSkinnedMesh) {
            rideMesh = o;
          }
        });

        const {instanceId} = app;
        const localPlayer = useLocalPlayer();

        const rideBone = sitSpec.sitBone ? rideMesh.skeleton.bones.find(bone => bone.name === sitSpec.sitBone) : null;

        const sitAction = {
          type: 'sit',
          time: 0,
          animation: sitSpec.subtype,
          controllingId: instanceId,
          controllingBone: rideBone,
        };
        localPlayer.setControlAction(sitAction);
      }
    } else {
      _unwear();
    }
  });
  
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

    const _updateDefaults = () => {
        const deltaSeconds = timeDiff / 1000;
        for (const mixer of animationMixers) {
          mixer.update(deltaSeconds);
        }
    };
    _updateDefaults();

    const _updatePet = () => {
      if (!!app.getComponent('pet')) {
        if (rootBone) {
          rootBone.quaternion.copy(rootBone.originalQuaternion);
        }
        
        if (petMixer) { // animated pet
          if (petSpec) { // activated pet
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
              app.updateMatrixWorld();
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
              if (walkAction || runAction) {
                idleAction.weight = 1 - Math.min(currentSpeed / walkSpeed, 1);
              } else {
                idleAction.weight = 1;
              }
            }
          } else { // unactivated pet
            if (idleAction) {
              idleAction.weight = 1;
            }
          }
          const deltaSeconds = timeDiff / 1000;
          petMixer.update(deltaSeconds);
        }
      } /*else {
        const deltaSeconds = timeDiff / 1000;
        for (const mixer of animationMixers) {
          mixer.update(deltaSeconds);
        }
      }*/
    };
    _updatePet();

    const _isMoving = (v) => {
      const threshold = 1;
      return Math.abs(v.x) > threshold || Math.abs(v.z) > threshold ? true : false; // Excluding velocity.y
    }

    const _applyDamping = (dampingAmount, timeDiff) => {
      return Math.pow(dampingAmount, timeDiff / 60);
    }

    const _updateRide = () => {
      if (!!app.getComponent('sit')) {
        if (sitSpec) { 
          const localPlayer = useLocalPlayer();
          const sitAction = localPlayer.getAction('sit');
          if(sitAction) {
            const velocity = localPlayer.characterPhysics.velocity;
            const speed = getSpeed(); // 0.1, ~0.3, 2 Getting speed from game.js
            const smooth = sitSpec.damping ? sitSpec.damping : 0.5; // smoothing animation end/start
            const factor = _applyDamping(smooth, timeDiff);

            if(_isMoving(velocity)) { // If is moving, gradually add to weight, else gradually decrease weight
              for (const action of mountActions) {
                if(!action.isRunning()) {
                  action.play(); // If clampWhenFinished is true and is clamped, play action again
                }
                if(action.weight < 1) {
                  action.weight += speed * factor;
                }
              }
            } else {
              for (const action of mountActions) {
                if(action.weight > 0) {
                  action.weight -= speed * factor;
                }
              }
            }
          }
        }
      }
    };
    _updateRide();
    
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
            if (!bone.originalWorldScale) {
              bone.originalWorldScale = bone.getWorldScale(new THREE.Vector3());
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
              bone.matrixWorld.compose(localVector, localQuaternion, bone.originalWorldScale);
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
      const boneName = Avatar.modelBoneRenames[boneAttachment];
      const bone = localPlayer.avatar.foundModelBones[boneName];
      if (bone) {
        bone.matrixWorld
          .decompose(app.position, app.quaternion, app.scale);
        if (Array.isArray(position)) {
          app.position.add(localVector.fromArray(position).applyQuaternion(app.quaternion));
        }
        if (Array.isArray(quaternion)) {
          app.quaternion.multiply(localQuaternion.fromArray(quaternion));
        }
        if (Array.isArray(scale)) {
          app.scale.multiply(localVector.fromArray(scale));
        }
        app.updateMatrixWorld();
      } else {
        console.warn('invalid bone attachment', {app, boneAttachment});
      }
    };
    const _updateWear = () => {
      if (wearSpec && localPlayer.avatar) {
        const {instanceId} = app;
        const localPlayer = useLocalPlayer();
        const appUseAction = Array.from(localPlayer.getActionsState()).find(action => action.type === 'use' && action.instanceId === instanceId);
        if (appUseAction && appUseAction.boneAttachment && wearSpec.boneAttachment) {
          _copyBoneAttachment(appUseAction);
        } else {
          if (modelBones) {
            Avatar.applyModelBoneOutputs(modelBones, localPlayer.avatar.modelBoneOutputs, localPlayer.avatar.getTopEnabled(), localPlayer.avatar.getBottomEnabled(), localPlayer.avatar.getHandEnabled(0), localPlayer.avatar.getHandEnabled(1));
            // modelBones.Hips.position.divideScalar(wearableScale);
            modelBones.Root.updateMatrixWorld();
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
    _unwear();
  });
  
  return root;
};