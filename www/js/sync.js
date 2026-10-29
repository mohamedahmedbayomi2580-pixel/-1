/* اتصال مباشر بين جهازين عبر WebRTC (شبكة الهوت سبوت المحلية - بدون إنترنت)
   تبادل الرموز يدوياً (نسخ/لصق) ثم تنتقل البيانات مباشرة بين الهاتفين */
const Sync={
  pc:null,ch:null,onopen:null,onclose:null,onmsg:null,
  enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o))))},
  dec(s){return JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/\s/g,'')))))},
  wait(pc){return new Promise(r=>{
    if(pc.iceGatheringState==='complete')return r();
    pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete')r()});
    setTimeout(r,4000);
  })},
  mk(){this.close();const pc=new RTCPeerConnection({iceServers:[]});this.pc=pc;return pc},
  setup(ch){
    this.ch=ch;
    ch.onopen=()=>this.onopen&&this.onopen();
    ch.onclose=()=>this.onclose&&this.onclose();
    ch.onmessage=e=>{try{this.onmsg&&this.onmsg(JSON.parse(e.data))}catch(x){}};
    if(ch.readyState==='open')setTimeout(()=>this.onopen&&this.onopen(),0);
  },
  async host(){
    const pc=this.mk();this.setup(pc.createDataChannel('cafe'));
    await pc.setLocalDescription(await pc.createOffer());await this.wait(pc);
    return this.enc(pc.localDescription);
  },
  async acceptAnswer(code){await this.pc.setRemoteDescription(this.dec(code))},
  async join(code){
    const pc=this.mk();pc.ondatachannel=e=>this.setup(e.channel);
    await pc.setRemoteDescription(this.dec(code));
    await pc.setLocalDescription(await pc.createAnswer());await this.wait(pc);
    return this.enc(pc.localDescription);
  },
  isOpen(){return !!this.ch&&this.ch.readyState==='open'},
  send(o){if(this.isOpen())this.ch.send(JSON.stringify(o))},
  close(){try{this.ch&&this.ch.close();this.pc&&this.pc.close()}catch(e){}this.pc=this.ch=null}
};
