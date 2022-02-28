import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useCleanup, useLocalPlayer, usePhysics, useLoaders, useActivate, useAvatarInternal, useInternals} = metaversefile;

// const wearableScale = 1;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

// const z180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

export default e => {
  const app = useApp();
  app.appType = 'glb';
  
  const root = app;
  
  const physics = usePhysics();
  const localPlayer = useLocalPlayer();
  // const Avatar = useAvatarInternal();

  const srcUrl = ${this.srcUrl};
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }
  
  app.glb = null;
  const hubsAnimationMixers = [];
  const uvScrolls = [];
  const physicsIds = [];
  
  // glb state
  let animations;

  // pet state
  let petSpec = null;
  let petMixer = null;
  let idleAction = null;
  let walkAction = null;
  let runAction = null;
  let rootBone = null;
  
  // sit state
  let sitSpec = null;
  
  const petComponent = app.getComponent('pet');
  const _makePetMixer = () => {
    let petMixer, idleAction;
    
    let firstMesh = null;
    app.glb.scene.traverse(o => {
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
      app.glb = o;
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
            if (o.material.transmission !== undefined) {
              o.material.transmission = 0;
              o.material.opacity = 0.25;
            }
          }
        });
      };
      _addAntialiasing(16);
      
      const _loadHubsComponents = () => {
        const _loadAnimations = () => {
          const animationEnabled = !!(app.getComponent('animation') ?? true);
          if (animationEnabled) {
            o.traverse(o => {
              if (o.isMesh) {
                const idleAnimation = animations.find(a => a.name === 'idle');
                let clip = idleAnimation || animations[hubsAnimationMixers.length];
                if (clip) {
                  const mixer = new THREE.AnimationMixer(o);
                  
                  const action = mixer.clipAction(clip);
                  action.play();

                  hubsAnimationMixers.push({
                    update(deltaSeconds) {
                      mixer.update(deltaSeconds)
                    }
                  });
                }
              }
            });
          }
        };

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
      
      root.add(o);
      o.updateMatrixWorld();
      
      const _addPhysics = async physicsComponent => {
        let physicsId;
        switch (physicsComponent.type) {
          case 'triangleMesh': {
            physicsId = physics.addGeometry(o);
            break;
          }
          case 'convexMesh': {
            physicsId = physics.addConvexGeometry(o);
            break;
          }
          default: {
            physicsId = null;
            break;
          }
        }
        if (physicsId !== null) {
          physicsIds.push(physicsId);
        } else {
          console.warn('glb unknown physics component', physicsComponent);
        }
      };
      let physicsComponent = app.getComponent('physics');
      if (physicsComponent) {
        if (physicsComponent === true) {
          physicsComponent = {
            type: 'triangleMesh',
          };
        }
        _addPhysics(physicsComponent);
      }
      o.traverse(o => {
        if (o.isMesh) {
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
      }
    }
  };
  app.addEventListener('wearupdate', e => {
    if (e.wear) {
      if (app.glb) {
        const {animations} = app.glb;
        
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
          app.glb.scene.traverse(o => {
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
    const _updateAnimation = () => {
      const petComponent = app.getComponent('pet');
      if (petComponent) {
        if (rootBone) {
          rootBone.quaternion.copy(rootBone.originalQuaternion);
          rootBone.updateMatrixWorld();
        }
        if (petMixer) { // animated pet
          if (petSpec) { // activated pet
            const speed = 0.0014;

            const distance = _getAppDistance();
            const moveDelta = localVector;
            moveDelta.setScalar(0);
            if (_isFar(distance)) { // handle rounding errors
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
            } /* else {
              // console.log('check', head === drop, component.attractedTo === 'fruit', typeof component.eatSpeed === 'number');
              if (head === drop && component.attractedTo === 'fruit' && typeof component.eatSpeed === 'number') {
                drop.scale.subScalar(1/component.eatSpeed*timeDiff);
                // console.log('new scale', drop.scale.toArray());
                if (drop.scale.x <= 0 || drop.scale.y <= 0 || drop.scale.z <= 0) {
                  dropManager.removeDrop(drop);
                }
              }
            } */
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
          petMixer.getRoot().updateMatrixWorld();
        }
      } else {
        const deltaSeconds = timeDiff / 1000;
        for (const mixer of hubsAnimationMixers) {
          mixer.update(deltaSeconds);
          app.updateMatrixWorld();
        }
      }
    };
    _updateAnimation();
    
    const _updateLook = () => {
      const lookComponent = app.getComponent('look');
      if (lookComponent && app.glb) {
        let skinnedMesh = null;
        app.glb.scene.traverse(o => {
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
              bone.updateMatrixWorld();
              lastLookQuaternion.copy(bone.quaternion);
            }
          }
        }
      }
    };
    _updateLook();
    
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
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const components = ${this.components};