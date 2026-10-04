/* SFX use Math.random, independent of the combat RNG. */
(() => {
  'use strict';
  function create({feedbackSpec}) {
  let soundOn=true,audio=null;
  function tone(freq, duration, shape = 'sine', volume = .05, slide = 1) {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = shape; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + duration);
  }
  function initAudio() { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {} }
  function stitchNodeSound(kind,index,echo=false) {
    if(kind==='normal'||echo){tone(kind==='triple'?280+index*12:90+index*9,.09,'triangle',.025,kind==='triple'?1.4:.35);return;}
    // The same falling chain motif, compressed for dense and opened by a second voice for triple.
    tone((90+index*9)*(kind==='dense'?.78:1),kind==='dense'?.06:.09,'triangle',.018,.35);
    if(kind==='triple')tone(280+index*12,.09,'triangle',.012,1.4);
  }
  function blastSound(kind='normal',echo=false,multiplier=1) {
    const f=feedbackSpec(kind,multiplier);
    if(kind==='dense'&&!echo){
      if(!soundOn||!audio||audio.state!=='running')return;
      // Keep the ordinary falling motif beneath the short, compressed stroke.
      tone(72,.14,'sine',.045,.38);tone(140,.07,'triangle',.025,.3);
      const now=audio.currentTime,osc=audio.createOscillator(),shape=audio.createWaveShaper(),gain=audio.createGain();
      osc.type='triangle';osc.frequency.setValueAtTime(f.bass,now);osc.frequency.exponentialRampToValueAtTime(f.bass*f.slide,now+.065);
      shape.curve=Float32Array.from({length:128},(_,i)=>Math.tanh((i/127*2-1)*2.5)/Math.tanh(2.5));shape.oversample='2x';
      const peak=.14+f.strength*.016;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(peak,now+f.attack);gain.gain.setValueAtTime(peak*.8,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+f.soundDuration);
      osc.connect(shape);shape.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+f.soundDuration);
      const length=Math.floor(audio.sampleRate*f.noiseDuration),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,4);
      const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),transient=audio.createGain();
      noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.8;
      transient.gain.setValueAtTime(f.noise,now);transient.gain.exponentialRampToValueAtTime(.0001,now+f.noiseDuration);
      noise.connect(filter);filter.connect(transient);transient.connect(audio.destination);noise.start(now);return;
    }
    if(kind==='triple'&&!echo){tone(72,.25,'sine',.07,.38);tone(140,.12,'triangle',.035,.3);}
    tone(echo?100:f.bass,kind==='dense'?.26:.32,'sine',echo?.08:kind==='dense'?.13+f.strength*.025:kind==='triple'?.035:.14,echo?.38:f.slide);
    tone(kind==='triple'?420:kind==='dense'?185:140,kind==='dense'?.10:.17,'triangle',echo?.035:kind==='triple'?.025:.07,kind==='triple'?1.65:.3);
    if(!soundOn||!audio||audio.state!=='running')return;
    const length=Math.floor(audio.sampleRate*.22),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
    // Sound uses a separate random source, so audio settings never alter gameplay.
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);
    const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    noise.buffer=buffer;filter.type=kind==='triple'?'bandpass':'lowpass';filter.frequency.value=kind==='triple'?1500:kind==='dense'?480:700;gain.gain.value=echo?.06:f.noise;
    noise.connect(filter);filter.connect(gain);gain.connect(audio.destination);noise.start();
  }
  return {tone,initAudio,stitchNodeSound,blastSound,toggle(){soundOn=!soundOn;if(soundOn)initAudio();},get enabled(){return soundOn;},get state(){return audio?.state;}};
  }
  globalThis.AshfallAudio={create};
})();
