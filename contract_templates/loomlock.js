import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, removeApp, useFrame, useLoaders, useCleanup, usePhysics, useLocalPlayer, useWeb3, useAbis} = metaversefile;

export default e => {
  const app = useApp();
  const physics = usePhysics();
  // const world = useWorld();
  const web3 = useWeb3();
  const {ERC721} = useAbis();
  const ERC721LoomLock = JSON.parse(JSON.stringify(ERC721));
  const tokenURIMethodAbi = ERC721LoomLock.find(m => m.name === 'tokenURI');
  const preRevealTokenURIAbi = JSON.parse(JSON.stringify(tokenURIMethodAbi));
  preRevealTokenURIAbi.name = 'preRevealTokenURI';
  ERC721LoomLock.push(preRevealTokenURIAbi);

  const contractAddress = '${this.contractAddress}';
  const tokenId = parseInt('${this.tokenId}', 10);
  // console.log('got token id', tokenId);

  const physicsIds = [];
  {
    const texture = new THREE.Texture();
    const geometry = new THREE.PlaneBufferGeometry(1, 1, 100, 100);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          type: 't',
          value: texture,
          needsUpdate: true,
        },
        uStartTime: {
          type: 'f',
          value: (Date.now()/1000) % 1,
          needsUpdate: true,
        },
        uTime: {
          type: 'f',
          value: 0,
          needsUpdate: true,
        },
        uHeadQuaternion: {
          type: 'q',
          value: new THREE.Quaternion(),
          needsUpdate: true,
        },
      },
      vertexShader: \`\\
        precision highp float;
        precision highp int;

        #define PI 3.1415926535897932384626433832795
        #define QUATERNION_IDENTITY vec4(0, 0, 0, 1)

        uniform float uStartTime;
        uniform float uTime;
        uniform vec4 uHeadQuaternion;

        // varying vec3 vViewPosition;
        varying vec2 vUv;

        mat4 getRotationMatrix(vec4 quaternion) {
          // vec4 quaternion = uHeadQuaternion;
          float qw = quaternion.w;
          float qx = quaternion.x;
          float qy = quaternion.y;
          float qz = quaternion.z;

          float n = 1.0f/sqrt(qx*qx+qy*qy+qz*qz+qw*qw);
          qx *= n;
          qy *= n;
          qz *= n;
          qw *= n;

          return mat4(
            1.0f - 2.0f*qy*qy - 2.0f*qz*qz, 2.0f*qx*qy - 2.0f*qz*qw, 2.0f*qx*qz + 2.0f*qy*qw, 0.0f,
            2.0f*qx*qy + 2.0f*qz*qw, 1.0f - 2.0f*qx*qx - 2.0f*qz*qz, 2.0f*qy*qz - 2.0f*qx*qw, 0.0f,
            2.0f*qx*qz - 2.0f*qy*qw, 2.0f*qy*qz + 2.0f*qx*qw, 1.0f - 2.0f*qx*qx - 2.0f*qy*qy, 0.0f,
            0.0f, 0.0f, 0.0f, 1.0f);
        }
        vec4 q_slerp(vec4 a, vec4 b, float t) {
          // if either input is zero, return the other.
          if (length(a) == 0.0) {
              if (length(b) == 0.0) {
                  return QUATERNION_IDENTITY;
              }
              return b;
          } else if (length(b) == 0.0) {
              return a;
          }

          float cosHalfAngle = a.w * b.w + dot(a.xyz, b.xyz);

          if (cosHalfAngle >= 1.0 || cosHalfAngle <= -1.0) {
              return a;
          } else if (cosHalfAngle < 0.0) {
              b.xyz = -b.xyz;
              b.w = -b.w;
              cosHalfAngle = -cosHalfAngle;
          }

          float blendA;
          float blendB;
          if (cosHalfAngle < 0.99) {
              // do proper slerp for big angles
              float halfAngle = acos(cosHalfAngle);
              float sinHalfAngle = sin(halfAngle);
              float oneOverSinHalfAngle = 1.0 / sinHalfAngle;
              blendA = sin(halfAngle * (1.0 - t)) * oneOverSinHalfAngle;
              blendB = sin(halfAngle * t) * oneOverSinHalfAngle;
          } else {
              // do lerp if angle is really small.
              blendA = 1.0 - t;
              blendB = t;
          }

          vec4 result = vec4(blendA * a.xyz + blendB * b.xyz, blendA * a.w + blendB * b.w);
          if (length(result) > 0.0) {
              return normalize(result);
          }
          return QUATERNION_IDENTITY;
        }

        void main() {
          float time = mod(uStartTime + uTime, 1.0);

          vec3 p = position;
          /* if (bar < 1.0) {
            float wobble = uDistance <= 0. ? sin(time * PI*10.)*0.02 : 0.;
            p.y *= (1.0 + wobble) * min(max(1. - uDistance/3., 0.), 1.0);
          }
          p.y += 0.01; */
          const float headCutoff = 0.54;
          const float legsCutoff = 0.12;
          const float legsSplit = 0.5;
          const vec3 headOffset = vec3(0, 0.25, 0.);
          if (uv.y > headCutoff) {
            // p.z = sin(time * PI * 2.) * (uv.y - headCutoff);
            p -= headOffset;
            // p.xz *= 0.5;
            p = (vec4(p, 1.) * getRotationMatrix(q_slerp(uHeadQuaternion, vec4(0., 0., 0., 1.), abs(p.x) * 2.))).xyz;
            // p.xz *= 2.;
            p += headOffset;
          } else if (uv.y < legsCutoff) {
            if (uv.x >= legsSplit) {
              p.z += sin(time * PI * 2.) * (legsCutoff - uv.y) * 2.;
            } else {
              p.z += -sin(time * PI * 2.) * (legsCutoff - uv.y) * 2.;
            }
          }
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vUv = uv;
        }
      \`,
      fragmentShader: \`\\
        precision highp float;
        precision highp int;

        #define PI 3.1415926535897932384626433832795

        // uniform float uTime;
        uniform sampler2D map;
        
        varying vec2 vUv;

        void main() {
          gl_FragColor = texture(map, vUv);
          if (gl_FragColor.a < 0.1) {
            discard;
          }
          if (!gl_FrontFacing) {
            gl_FragColor = vec4(0., 0., 0., 1.);
          }
        }
      \`,
      transparent: true,
      side: THREE.DoubleSide,
      // polygonOffset: true,
      // polygonOffsetFactor: -1,
      // polygonOffsetUnits: 1,
    });
    const imageMesh = new THREE.Mesh(geometry, material);
    useFrame(({timestamp}) => {
      const f = (timestamp/1000) % 1;
      imageMesh.material.uniforms.uTime.value = f;
      imageMesh.material.uniforms.uTime.needsUpdate = true;
      
      const player = useLocalPlayer();
      const quaternion = imageMesh.getWorldQuaternion(new THREE.Quaternion());
      
      let lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          imageMesh.getWorldPosition(new THREE.Vector3())
            .add(new THREE.Vector3(0, 0.25, 0).applyQuaternion(quaternion)),
          player.position,
          new THREE.Vector3(0, 1, 0)
        )
      ).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
      const angle = lookQuaternion.angleTo(new THREE.Quaternion());
      // console.log('got angle', angle);
      if (angle < Math.PI*0.4) {
        // nothing
      } else {
        lookQuaternion = new THREE.Quaternion();
      }
      
      imageMesh.material.uniforms.uHeadQuaternion.value.slerp(lookQuaternion, 0.1); // setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-0.5 + f) * Math.PI);
      imageMesh.material.uniforms.uHeadQuaternion.needsUpdate = true;
    });
    
    (async () => {
      const contract = new web3.eth.Contract(ERC721LoomLock, contractAddress);
      
      const tokenURI = await contract.methods.preRevealTokenURI(tokenId).call();
      const res = await fetch(tokenURI);
      const j = await res.json();
      console.log('got loomlocknft j', j);
      
      const img = new Image();
      await new Promise((accept, reject) => {
        img.onload = accept;
        img.onerror = reject;
        img.crossOrigin = 'Aynonymous';
        img.src = j.image;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const queue = [
        [0, 0],
        [canvas.width-1, 0],
        [0, canvas.height-1],
        [canvas.width-1, canvas.height-1],
      ];
      const seen = {};
      const _getKey = (x, y) => x + ':' + y;
      while (queue.length > 0) {
        const [x, y] = queue.pop();
        const k = _getKey(x, y);
        if (!seen[k]) {
          seen[k] = true;
          
          const startIndex = y*imageData.width*4 + x*4;
          const endIndex = startIndex + 4;
          const [r, g, b, a] = imageData.data.slice(startIndex, endIndex);
          if (r < 255/8 && g < 255/8 && b < 255/8) {
            // nothing
          } else {
            imageData.data[startIndex] = 0;
            imageData.data[startIndex+1] = 0;
            imageData.data[startIndex+2] = 0;
            imageData.data[startIndex+3] = 0;
            
            const _tryQueue = (x, y) => {
              if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                const k = _getKey(x, y);
                if (!seen[k]) {
                  queue.push([x, y]);
                }
              }
            };
            _tryQueue(x-1, y-1);
            _tryQueue(x,   y-1);
            _tryQueue(x+1, y-1);
            
            _tryQueue(x-1, y);
            // _tryQueue(x, y);
            _tryQueue(x+1, y);
            
            _tryQueue(x-1, y+1);
            _tryQueue(x,   y+1);
            _tryQueue(x+1, y+1);
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      
      texture.image = canvas;
      texture.needsUpdate = true;
      imageMesh.material.uniforms.map.needsUpdate = true;
    })();
    
    // imageMesh.position.set(0, 1.3, -0.2);
    app.add(imageMesh);
    
    const physicsId = physics.addBoxGeometry(
      imageMesh.position,
      imageMesh.quaternion,
      new THREE.Vector3(1/2, 1/2, 0.01),
      false
    );
    physicsIds.push(physicsId);
  }
  
  app.addEventListener('activate', e => {
    removeApp(app);
    app.destroy();
  });

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });
  
  return app;
};