/* اكتشاف الموظفين تلقائياً على نفس الشبكة (الهوت سبوت) عبر UDP
   - الموظف (وهو على شاشة «الاتصال بالمالك») يبث اسمه كل ثانيتين
   - المالك يفتح نقطة الاتصال فيظهر له الموظفون ويضغط «اتصال»
   - بعدها يتبادل الجهازان رمز WebRTC تلقائياً (بدل النسخ واللصق) ويتحقق الكود كالمعتاد
   يحتاج إضافة UDP في تطبيق الأندرويد؛ ولو غير متوفرة تبقى الطريقة اليدوية تعمل كما هي. */
const Disc=(()=>{
  const PORT=41234,MAGIC='cafepos1',CHUNK=600;
  const NAMES=['UdpSocket','CapacitorUdpSocket','Udp','UDP','UdpPlugin','FrontallCapacitorUdp'];
  const BCAST=['255.255.255.255','192.168.43.255','192.168.137.255'];
  let U=null,sid=null,role=null,ti=null,lh=null,H={},peers=new Map(),parts=new Map(),me={id:'',name:''};
  const plugin=()=>{
    const C=window.Capacitor;if(!C||!C.isNativePlatform||!C.isNativePlatform())return null;
    for(const n of NAMES){try{if((C.isPluginAvailable&&C.isPluginAvailable(n))||(C.Plugins&&C.Plugins[n]))return C.Plugins[n]||null}catch(e){}}
    return null;
  };
  const available=()=>!!plugin();
  const b64=s=>btoa(unescape(encodeURIComponent(s)));
  const unb64=s=>decodeURIComponent(escape(atob(s)));
  async function raw(ip,obj){
    const txt=JSON.stringify(Object.assign({m:MAGIC},obj));
    try{await U.send({socketId:sid,address:ip,port:PORT,buffer:b64(txt)})}catch(e){}
  }
  const bcast=obj=>Promise.all(BCAST.map(ip=>raw(ip,obj)));
  function parse(buf){
    for(const f of [()=>unb64(buf),()=>buf]){try{const o=JSON.parse(f());if(o&&o.m===MAGIC)return o}catch(e){}}
    return null;
  }
  function onRecv(ev){
    if(!ev||(ev.socketId!=null&&sid!=null&&ev.socketId!==sid))return;
    const p=parse(ev.buffer);if(!p)return;const ip=ev.remoteAddress;
    if(role==='owner'&&p.t==='a'){peers.set(p.id,{id:p.id,name:p.name,ip,seen:Date.now()});push()}
    else if(role==='seller'&&p.t==='o'){H.onOwner&&H.onOwner(p.name,ip)}
    else if(p.t==='c'){
      const k=p.mid,e=parts.get(k)||{n:p.n,got:{},kind:p.k,from:p.from,to:p.to,done:false};
      parts.set(k,e);e.got[p.i]=p.d;
      if(!e.done&&Object.keys(e.got).length===e.n){
        e.done=true;const code=Array.from({length:e.n},(_,i)=>e.got[i]).join('');
        if(e.kind==='offer'&&role==='seller'&&e.to===me.id)H.onOffer&&H.onOffer(e.from,ip,code);
        if(e.kind==='answer'&&role==='owner')H.onAnswer&&H.onAnswer(e.from,code);
        setTimeout(()=>parts.delete(k),15000);
      }
    }
  }
  const push=()=>{const now=Date.now();for(const [k,v] of peers)if(now-v.seen>7000)peers.delete(k);H.onPeers&&H.onPeers([...peers.values()])};
  async function open(){
    U=plugin();if(!U)throw new Error('no-udp');
    let r;try{r=await U.create({properties:{name:'cafe',bufferSize:8192}})}catch(e){r=await U.create()}
    sid=(r&&r.socketId!=null)?r.socketId:r;
    await U.bind({socketId:sid,port:PORT});
    try{await U.setBroadcast({socketId:sid,enabled:true})}catch(e){}
    lh=await U.addListener('receive',onRecv);
  }
  async function start(r,h,tick){
    await stop();role=r;H=h;peers.clear();parts.clear();
    await open();tick();ti=setInterval(tick,2000);
  }
  const startOwner=(name,h)=>start('owner',h,()=>{bcast({t:'o',name});push()});
  const startSeller=(id,name,h)=>{me={id,name};return start('seller',h,()=>bcast({t:'a',id,name}))};
  /* إرسال رمز طويل على قطع صغيرة (ثلاث مرات لتعويض ضياع الحزم) */
  async function sendCode(ip,kind,from,to,code){
    const mid=Math.random().toString(36).slice(2,9),n=Math.ceil(code.length/CHUNK);
    for(let rep=0;rep<3;rep++){
      for(let i=0;i<n;i++)await raw(ip,{t:'c',mid,i,n,k:kind,from,to,d:code.slice(i*CHUNK,(i+1)*CHUNK)});
      await new Promise(r=>setTimeout(r,350));
    }
  }
  async function stop(){
    clearInterval(ti);ti=null;
    try{lh&&lh.remove&&await lh.remove()}catch(e){}
    try{U&&sid!=null&&await U.close({socketId:sid})}catch(e){}
    lh=null;sid=null;role=null;peers.clear();
  }
  return {available,startOwner,startSeller,sendCode,stop,get active(){return !!role},get role(){return role},get peers(){return [...peers.values()]}};
})();
