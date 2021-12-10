# Totum

## Overview

This library takes an arbitrary URL (https://, ethereum://, and more) and compiles it into a THREE.js app representing it, written against the Metaversefile API. 

You can use this library to translate your avatars, models, NFTs, web pages (and more) into a collection of `import()`-able little web apps that interoperate with each other.

The metaverse loader is intended to be driven by a server framework (like vite.js/rollup.js), and game engine client (like Webaverse) to provide a complete immersive world (or metaverse) to the user.

It is easy to define your own data types and NFT interpretations by writing your own app template. If you would like to support a new file format or Ethereum Token, we would appreciate a PR.

Although this library does not provide game engine facilities, the API is designed to be easy to hook into game engines, and to be easy to drive using AIs like OpenAI's Codex.

---

## Usage

```js

	let  object;
	try {
		object = await  metaversefileApi.load(url);
	} catch (err) {
		console.warn(err);
	}
	return  object;

```

### Inputs 
* url: {URL of the asset that can be downloadable by the screenshot system} **[Required]**

### Returns 
* Promise: 

### Output
* Object of application

### Supported Assets 
* `VRM`
* `VOX`
* `JS`
* `SCN`
* `LIGHT`
* `IMAGE`
* `HTML`
* `GROUP`
* `GLBB`
* `GLB`
* `GIF`
* `FOG`
* `Background`

## Motivations

- A system which takes any token (or any URL) and manifests it as an object in a 3D MMO
- Totum transmutes blockchain data on the backend, serving composable little WASM+JS apps your browser can import()
- Totum works permissionlessly on existing tokens. Connect MetaMask, have inventory.
- Totum is pure open source web tech (as the web3 verse should be)
- Totum is moddable; make your metaverse look and work the way you want
- Totum integrates into game engines, which provide the game. We intergrated it into Webaverse.
- Totum works with 2D ($1K jpg) and 3D ($15K fbx) assets. Our team has an NFT budget for testing.
- Token description language (.metaversefile) to declare how tokens should be presented. Sword? Wearable loot? Pet is aggro? Think CSS/JSON for the metaverse.
- RPG-style stats for each item, which have fun gameplay effects in the MMO
- Totum accepts PRs to improve the resolution of the metaverse
- It's called Totum because it snaps together your NFTs into a total experience

---
## Architecture

### Flow Diagram

![Totum diagram 02](https://user-images.githubusercontent.com/51108458/144339720-354aa56d-aa61-4e96-b49c-bf9e652d1f48.png)



---
