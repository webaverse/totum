import * as THREE from 'three';
import pako from 'pako';
import metaversefile from 'metaversefile';
const {useApp, useLoaders, useCleanup, usePhysics, useWeb3, useAbis} = metaversefile;

const _capitalize = s => s.slice(0, 1).toUpperCase() + s.slice(1);
const _capitalizeWords = s => {
  let words = s.split(/\\s/);
  words = words.map(_capitalize);
  return words.join(' ');
};
const _normalizeName = name => {
  const weapons = [
      "Warhammer",
      "Quarterstaff",
      "Maul",
      "Mace",
      "Club",
      "Katana",
      "Falchion",
      "Scimitar",
      "Long Sword",
      "Short Sword",
      "Ghost Wand",
      "Grave Wand",
      "Bone Wand",
      "Wand",
      "Grimoire",
      "Chronicle",
      "Tome",
      "Book"
  ];
  const chestArmor = [
      "Divine Robe",
      "Silk Robe",
      "Linen Robe",
      "Robe",
      "Shirt",
      "Demon Husk",
      "Dragonskin Armor",
      "Studded Leather Armor",
      "Hard Leather Armor",
      "Leather Armor",
      "Holy Chestplate",
      "Ornate Chestplate",
      "Plate Mail",
      "Chain Mail",
      "Ring Mail"
  ];
  const headArmor = [
      "Ancient Helm",
      "Ornate Helm",
      "Great Helm",
      "Full Helm",
      "Helm",
      "Demon Crown",
      "Dragon's Crown",
      "War Cap",
      "Leather Cap",
      "Cap",
      "Crown",
      "Divine Hood",
      "Silk Hood",
      "Linen Hood",
      "Hood"
  ];
  const waistArmor = [
      "Ornate Belt",
      "War Belt",
      "Plated Belt",
      "Mesh Belt",
      "Heavy Belt",
      "Demonhide Belt",
      "Dragonskin Belt",
      "Studded Leather Belt",
      "Hard Leather Belt",
      "Leather Belt",
      "Brightsilk Sash",
      "Silk Sash",
      "Wool Sash",
      "Linen Sash",
      "Sash"
  ];
  const footArmor = [
      "Holy Greaves",
      "Ornate Greaves",
      "Greaves",
      "Chain Boots",
      "Heavy Boots",
      "Demonhide Boots",
      "Dragonskin Boots",
      "Studded Leather Boots",
      "Hard Leather Boots",
      "Leather Boots",
      "Divine Slippers",
      "Silk Slippers",
      "Wool Shoes",
      "Linen Shoes",
      "Shoes"
  ];
  const handArmor = [
      "Holy Gauntlets",
      "Ornate Gauntlets",
      "Gauntlets",
      "Chain Gloves",
      "Heavy Gloves",
      "Demon's Hands",
      "Dragonskin Gloves",
      "Studded Leather Gloves",
      "Hard Leather Gloves",
      "Leather Gloves",
      "Divine Gloves",
      "Silk Gloves",
      "Wool Gloves",
      "Linen Gloves",
      "Gloves"
  ];
  const necklaces = [
      "Necklace",
      "Amulet",
      "Pendant"
  ];
  const rings = [
      "Gold Ring",
      "Silver Ring",
      "Bronze Ring",
      "Platinum Ring",
      "Titanium Ring"
  ];
  const all = [weapons, chestArmor, headArmor, waistArmor, footArmor, handArmor, necklaces, rings].flat();
  for (const n of all) {
    if (name.includes(n)) {
      return n;
    }
  }
  return null;
};

export default e => {
  const app = useApp();
  const physics = usePhysics();
  const web3 = useWeb3();
  const {ERC721} = useAbis();
  
  const contractAddress = '${this.contractAddress}';
  const tokenId = parseInt('${this.tokenId}', 10);
  console.log('got token id', tokenId);
  
  const physicsIds = [];
  e.waitUntil((async () => {
    const contract = new web3.eth.Contract(ERC721, contractAddress);
    console.log('got contract', {ERC721, contractAddress, contract});

    const tokenURI = await contract.methods.tokenURI(tokenId).call();
    const res = await fetch(tokenURI);
    const j = await res.json();
    console.log('got moreloot j', j);

    let spec;
    {
      const res2 = await fetch(j.image);
      const text = await res2.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const elements = Array.from(doc.querySelectorAll('text')).map(e => e.innerHTML);
      // console.log('got doc', doc, elements);
      
      let index = 0;
      const slots = {
        weapon: elements[index++],
        chest: elements[index++],
        head: elements[index++],
        waist: elements[index++],
        foot: elements[index++],
        hand: elements[index++],
        neck: elements[index++],
        ring: elements[index++],
      };
      const srcUrls = Object.keys(slots).map(k => {
        const v = _normalizeName(slots[k]);
        if (!v) {
          debugger;
        }
        return 'https://webaverse.github.io/loot-assets/' + k + '/' + _capitalizeWords(v).replace(/\\s/g, '_') + '/' + v.toLowerCase().replace(/\\s/g, '_') + '.glb';
      });
      
      console.log('loading', {slots, srcUrls});
      
      // const srcUrl = 'https://webaverse.github.io/loot-assets/chest/Ring_Mail/ring_mail.glb';
      for (const srcUrl of srcUrls) {
        let o;
        try {
          o = await new Promise((accept, reject) => {
            const {gltfLoader} = useLoaders();
            gltfLoader.load(srcUrl, accept, function onprogress() {}, reject);
          });
          o = o.scene;
        } catch(err) {
          console.warn(err);
        }
        // console.log('got o', o);
        if (o) {
          app.add(o);
          
          const _addPhysics = async () => {
            const mesh = o;

            mesh.updateMatrixWorld();
            const physicsMesh = physics.convertMeshToPhysicsMesh(mesh);
            physicsMesh.position.copy(mesh.position);
            physicsMesh.quaternion.copy(mesh.quaternion);
            physicsMesh.scale.copy(mesh.scale);

            app.add(physicsMesh);
            const physicsId = physics.addGeometry(physicsMesh);
            app.remove(physicsMesh);
            physicsIds.push(physicsId);
          };
          _addPhysics();
        }
      }
    }
  })());

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });
  
  // console.log('got app', app);
  
  return app;
};