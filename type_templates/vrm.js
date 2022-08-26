import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, usePhysics, useAvatarRenderer, useCamera, useCleanup, useActivate, useLocalPlayer, useCharacterQuality} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
// const q180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const _fetchArrayBuffer = async srcUrl => {
  const res = await fetch(srcUrl);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer;
  } else {
    throw new Error('failed to load: ' + res.status + ' ' + srcUrl);
  }
};

export default e => {
  const app = useApp();
  const camera = useCamera();
  const physics = usePhysics();

  const srcUrl = ${this.srcUrl};

  let avatarRenderer = null;
  let physicsIds = [];
  let activateCb = null;
  e.waitUntil((async () => {
    const arrayBuffer = await _fetchArrayBuffer(srcUrl);
    
    const AvatarRenderer = useAvatarRenderer();
    avatarRenderer = new AvatarRenderer({
      arrayBuffer,
      srcUrl,
      quality: useCharacterQuality(),
      camera,
      isVrm: true,
    });
    app.avatarRenderer = avatarRenderer;
    await avatarRenderer.waitForLoad();
    app.add(avatarRenderer.scene);
    avatarRenderer.scene.updateMatrixWorld();

    // globalThis.app = app;
    // globalThis.avatarRenderer = avatarRenderer;

    const _addPhysics = () => {
      const fakeHeight = 1.5;
      localMatrix.compose(
        localVector.set(0, fakeHeight / 2, 0),
        localQuaternion.identity(),
        localVector2.set(0.3, fakeHeight / 2, 0.3)
      )
        .premultiply(app.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);

      const physicsId = physics.addBoxGeometry(
        localVector,
        localQuaternion,
        localVector2,
        false
      );
      physicsIds.push(physicsId);
    };
    if (app.getComponent('physics')) {
      _addPhysics();
    }

    // we don't want to have per-frame bone updates for unworn avatars
    const _disableSkeletonMatrixUpdates = () => {
      avatarRenderer.scene.traverse(o => {
        if (o.isBone) {
          o.matrixAutoUpdate = false;
        }
      });
    };
    _disableSkeletonMatrixUpdates();

    // handle wearing
    activateCb = async () => {
      const localPlayer = useLocalPlayer();
      localPlayer.setAvatarApp(app);
    };
  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  // controlled tracking
  const _setPhysicsEnabled = enabled => {
    if (enabled) {
      for (const physicsId of physicsIds) {
        physics.disableGeometry(physicsId);
        physics.disableGeometryQueries(physicsId);
      }
    } else {
      for (const physicsId of physicsIds) {
        physics.enableGeometry(physicsId);
        physics.enableGeometryQueries(physicsId);
      }
    }
  };
  const _setControlled = controlled => {
    avatarRenderer && avatarRenderer.setControlled(controlled);
    _setPhysicsEnabled(controlled);
  };
  _setControlled(!!app.getComponent('controlled'));
  app.addEventListener('componentupdate', e => {
    const {key, value} = e;
    if (key === 'controlled') {
      _setControlled(value);
    }
  });

  // cleanup
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'vrm';
export const components = ${this.components};