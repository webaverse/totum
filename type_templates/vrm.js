import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, usePhysics, useAvatarRenderer, useCamera, useCleanup, useFrame, useActivate, useLocalPlayer} = metaversefile;

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
  let frameCb = null;
  e.waitUntil((async () => {
    const arrayBuffer = await _fetchArrayBuffer(srcUrl);
    
    const AvatarRenderer = useAvatarRenderer();
    avatarRenderer = new AvatarRenderer({
      arrayBuffer,
      srcUrl,
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
      const HEAD_HEIGHT = 0.15; // head height is zero in initialization so we need to take it into account
      const {height, width} = app.avatarRenderer.getAvatarSize();

      const radius = width / 2;
      const capsuleHalfHeight = (height + HEAD_HEIGHT) / 2;

      localMatrix.compose(
        localVector.set(0, capsuleHalfHeight + (HEAD_HEIGHT / 2), 0), // start position
        localQuaternion.setFromAxisAngle(localVector2.set(0, 0, 1), Math.PI / 2), // rotate 90 degrees 
        localVector2.set(radius, capsuleHalfHeight / 2, radius)
      )
        .premultiply(app.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);

      const physicsId = physics.addCapsuleGeometry(
        localVector,
        localQuaternion,
        radius,
        capsuleHalfHeight,
        false
      );
      physicsIds.push(physicsId);
    };

    if (app.getComponent('physics')) {
      _addPhysics();
    }

    avatarRenderer.initControlObject(app);

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

    const {height} = avatarRenderer.getAvatarSize();
    frameCb = ({timestamp, timeDiff}) => {
      if (!avatarRenderer.isAvatarBound) {
        avatarRenderer.updateObject(timestamp, timeDiff, height);
      }
    };
  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  useFrame((e) => {
    frameCb && frameCb(e);
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