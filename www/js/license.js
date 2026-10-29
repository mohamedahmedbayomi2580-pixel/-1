/* نظام التفعيل: كل الأكواد تعمل دائماً ويمكن استخدامها أي عدد من المرات (كل مرة تضيف مدتها).
   كود البداية = 24 ساعة، وأكواد للتمديد، وكود للتفعيل الدائم.
   الأكواد وكلمة سر النسخ الاحتياطي محفوظة كبصمات SHA-256 (غير ظاهرة كنص في الكود). */
const Lic=(()=>{
  const DAY=864e5;
  const H={start:"a9b3c3aefc22f44d6687a94384262e27aa74a6ba7174f4103d4843a7a9a03880",d1:"d2bad6bc0c50ccdc07e4fd17675a343c73b5d36c74a78667608fbb42a1f6ac17",d7:"d56582dc3bead46899b210acbad1d5c6d3208665ed7428ee9c7b079f310a3efe",d3:"69a74b69cc40004eb2d6941a981c915a0527ffceaf9c55b79e02a5c3ac80d094",m1:"ebd56489fcd30ef37fa2a13e225cf55b8457d6414251ca939ca7053065c00d18",perm:"6a89adb5a98fbae13904d7f3a4f0a467bdb745d56c84a8c9eb3270041a3efb40",pass:"6cf1155d1f3b171ebbccaa930ce8a3191c8922d55186cf3f19cbf905358f9389"};
  const ADD={[H.start]:{ms:DAY,label:'24 ساعة'},[H.d1]:{ms:DAY,label:'يوم واحد'},[H.d3]:{ms:3*DAY,label:'72 ساعة'},[H.d7]:{ms:7*DAY,label:'أسبوع'},[H.m1]:{ms:30*DAY,label:'شهر'}};
  /* SHA-256 متزامن */
  function sha256(str){
    const K=[],r=(v,n)=>(v>>>n)|(v<<(32-n));let p=2,c=0;
    const H0=[];
    while(c<64){let ok=true;for(let i=2;i*i<=p;i++)if(p%i===0){ok=false;break}
      if(ok){if(c<8)H0[c]=(Math.pow(p,.5)*4294967296)|0;K[c++]=(Math.pow(p,1/3)*4294967296)|0}p++}
    const b=unescape(encodeURIComponent(str)),L=b.length*8,w=[];
    let m=b+'\x80';while(m.length%64-56)m+='\x00';
    for(let i=0;i<m.length;i++)w[i>>2]=(w[i>>2]<<8)|m.charCodeAt(i);
    w[w.length]=(L/4294967296)|0;w[w.length]=L|0;
    let h=H0.slice(0,8);
    for(let j=0;j<w.length;){
      const x=w.slice(j,j+=16),o=h.slice(0);
      for(let i=0;i<64;i++){
        if(i>=16){const a=x[i-15],e=x[i-2];x[i]=(x[i-16]+(r(a,7)^r(a,18)^(a>>>3))+x[i-7]+(r(e,17)^r(e,19)^(e>>>10)))|0}
        const a=o[0],e=o[4];
        const t1=(o[7]+(r(e,6)^r(e,11)^r(e,25))+((e&o[5])^(~e&o[6]))+K[i]+x[i])|0;
        const t2=((r(a,2)^r(a,13)^r(a,22))+((a&o[1])^(a&o[2])^(o[1]&o[2])))|0;
        o.unshift((t1+t2)|0);o[4]=(o[4]+t1)|0;o.pop();
      }
      for(let i=0;i<8;i++)h[i]=(h[i]+o[i])|0;
    }
    return h.map(v=>('00000000'+(v>>>0).toString(16)).slice(-8)).join('');
  }
  const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,'');
  const hh=s=>sha256(norm(s));
  let getDb=()=>null;
  const init=f=>{getDb=f};
  const now=()=>{const l=getDb().license;return Math.max(Date.now(),(l&&l.last)||0)};  /* يمنع الغش بتأخير ساعة الهاتف */
  function touch(){const l=getDb().license;if(l&&Date.now()>(l.last||0)){l.last=Date.now();return true}return false}
  function status(){
    const l=getDb().license;
    if(!l)return {ok:false,reason:'new'};
    if(l.perm)return {ok:true,perm:true,left:Infinity};
    const left=l.exp-now();
    return left>0?{ok:true,left}:{ok:false,reason:'expired'};
  }
  function apply(code){
    const db=getDb(),k=hh(code),l=db.license,t=now();
    if(!norm(code))return {ok:false,msg:'اكتب كود التفعيل'};
    if(k===H.perm){db.license={perm:true,start:(l&&l.start)||t,last:t};return {ok:true,msg:'تم تفعيل التطبيق نهائياً ✔'}}
    const a=ADD[k];
    if(a){
      if(l&&l.perm)return {ok:true,msg:'التطبيق مفعّل نهائياً بالفعل'};
      const base=Math.max(t,(l&&l.exp)||0);
      db.license={exp:base+a.ms,start:(l&&l.start)||t,last:t};return {ok:true,msg:'تم التمديد: '+a.label+' ✔'};
    }
    return {ok:false,msg:'كود التفعيل غير صحيح'};
  }
  const checkPass=p=>hh(p)===H.pass;
  function fmtLeft(ms){
    if(ms===Infinity)return 'مفعّل نهائياً';
    let s=Math.max(0,Math.floor(ms/1000));const d=Math.floor(s/86400);s%=86400;
    const p=n=>String(n).padStart(2,'0'),hms=p(Math.floor(s/3600))+':'+p(Math.floor(s%3600/60))+':'+p(s%60);
    return d?d+' يوم و '+hms:hms;
  }
  return {init,status,apply,touch,checkPass,fmtLeft,sha256};
})();
