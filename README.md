# Totum

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

---
## Architecture

### Flow Diagram

![Metaverse-File](https://user-images.githubusercontent.com/51108458/144321396-2425a49d-ae19-4771-a5f0-930d2d4e67e3.png)


---
