# Metaversefile implementation in Javascript/THREE.js

# What is this repository?

In the webaverse, there are many types of experiences and content, and they come in all shapes, forms and sizes. For this reason we have the metaversefile repo to aid in loading all of the various kinds of files.

# No one file is the same

For this reason we have a types templates directory and files within it that contain loaders for the various files. 

# Example
## glb.js
This contains functionality around loading glb files and can be used to modify the loader to change specific aspects of the GLTF2 model being loaded in. Stuff like materials, meshes, and anything else we can fit into the loader. Including shaders.

## gltj.js
We are also giving users the ability to load shaders directly from a repository.


# Expectations
You are expected to load your sub-app/ file through the .metaversefile startURL, if you explore this repo you will see that each type template is looking for specific keys to be able to handle the load of the file, and will make use of the startURL to find the entry point before loading.


