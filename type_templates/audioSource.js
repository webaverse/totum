import metaversefile from 'metaversefile';

export default e => {
  const app =  metaversefile.useApp();
  const srcUrl = ${this.srcUrl};
  const mode = app.getComponent('mode') ?? 'attached';
  const sounds = metaversefile.useSound();
  const soundFiles = sounds.getSoundFiles();
  let j = null;
  let candidateSound = null;
  let volume = 1;
  if (mode === 'attached') {
    (async () => {
      const res = await fetch(srcUrl);
      j = await res.json();
      if (j) {
        let regex = new RegExp(j.sound, "i");
        const candidateSounds = soundFiles.audiosource.filter(f => regex.test(f.name));
        const soundIndex = j.index !== undefined ? j.index : 0; 
        volume = j.volume !== undefined ? j.volume : 1;
        candidateSound = candidateSounds[soundIndex];
      }
    })();
  }
  let localSound = null;
  metaversefile.useCleanup(() => {
    if(localSound)
        localSound.stop();
  });
  let startPlayTime = 0;
   
  metaversefile.useFrame(({timestamp}) => {
    if(j && candidateSound){
        const timeSeconds = timestamp / 1000;
        if(timeSeconds - startPlayTime > candidateSound.duration || startPlayTime === 0 ){
            localSound = sounds.playSound(candidateSound);
            if(volume !== 1){
                const gainNode = localSound.context.createGain();
                gainNode.connect(localSound.context.destination); 
                localSound.disconnect(localSound.context);
                localSound.connect(gainNode);
                gainNode.gain.value = volume;
                
            } 
            startPlayTime = timeSeconds;
        }
    }
    
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'audiosource';
export const components = ${this.components};