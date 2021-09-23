import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, removeApp, useLoaders, useCleanup, usePhysics, useWeb3, useAbis} = metaversefile;

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
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const imageMesh = new THREE.Mesh(geometry, material);
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
      texture.image = img;
      texture.needsUpdate = true;
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