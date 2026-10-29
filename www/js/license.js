/* نظام التفعيل: عداد تجريبي 24 ساعة بكود البداية + أكواد التمديد + التفعيل الدائم
   الحالة تُحفظ في localStorage مع توقيع (checksum) + حماية ضد تأخير ساعة الجهاز */
const Lic=(()=>{
  const K='cafe_lic_v1',SALT='mh|cafe|240075',H=3600e3;
  const START='mh240075',FOREVER='mh240075eng';
  const EXT={'mh240075001':24*H,'mh240075003':72*H,'mh240075007':168*H};
  const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};
  const norm=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
  function load(){
    let raw=null;try{raw=localStorage.getItem(K)}catch(e){}
    if(!raw)return null;                                   /* لم يُفعّل من قبل */
    try{const r=JSON.parse(raw);if(r&&r.c===hash(r.d+SALT))return JSON.parse(r.d)}catch(e){}
    return {s:1,e:0,p:0,l:Date.now()};                     /* بيانات معدَّلة يدوياً → مقفول */
  }
  let st=load(),lastW=0;
  function save(force){
    if(!st)return;const now=Date.now();
    if(!force&&now-lastW<60000)return;lastW=now;
    const d=JSON.stringify(st);
    try{localStorage.setItem(K,JSON.stringify({d,c:hash(d+SALT)}))}catch(e){}
  }
  /* الوقت الحالي مع منع الرجوع بالساعة للخلف */
  function now(){const t=Date.now();if(st){if(t>st.l){st.l=t;save()}return Math.max(t,st.l)}return t}
  const remaining=()=>!st?0:st.p?Infinity:Math.max(0,st.e-now());
  const active=()=>!!st&&(!!st.p||remaining()>0);
  function apply(input){
    const c=norm(input);if(!c)return {ok:false,msg:'اكتب كود التفعيل'};
    if(c===FOREVER){st=Object.assign(st||{s:1,e:0,l:Date.now()},{p:1,s:1});save(true);return {ok:true,msg:'تم التفعيل بشكل دائم ✅'}}
    if(c===START){
      if(st&&st.s)return {ok:false,msg:'هذا الكود مستخدم من قبل على هذا الجهاز'};
      st={s:1,p:0,e:Date.now()+24*H,l:Date.now()};save(true);return {ok:true,msg:'تم التفعيل لمدة 24 ساعة ✅'};
    }
    if(EXT[c]){
      if(!st)st={s:1,p:0,e:0,l:Date.now()};
      if(st.p)return {ok:true,msg:'التطبيق مفعّل دائماً بالفعل'};
      const base=Math.max(now(),st.e||0);st.e=base+EXT[c];save(true);
      return {ok:true,msg:'تم التمديد '+({'mh240075001':'يوم واحد','mh240075003':'72 ساعة','mh240075007':'أسبوع'}[c])+' ✅'};
    }
    return {ok:false,msg:'كود التفعيل غير صحيح'};
  }
  function fmt(ms){
    if(ms===Infinity)return 'مفعّل دائماً';
    const m=Math.floor(ms/60000),d=Math.floor(m/1440),h=Math.floor(m%1440/60),n=m%60,p=[];
    if(d)p.push(d+' يوم');if(h)p.push(h+' ساعة');if(!d)p.push(n+' دقيقة');
    return 'متبقي: '+p.join(' و ');
  }
  const status=()=>!st?'غير مفعّل':active()?fmt(remaining()):'انتهت الفترة';

  /* ===== شاشة القفل ===== */
  function gate(){
    if(document.getElementById('lic-gate'))return;
    const g=document.createElement('div');g.id='lic-gate';
    g.innerHTML=`<div class="card lic-box"><div class="lic-ic">🔒</div>
      <h2>كاشير الكافيه</h2>
      <p class="lic-msg">${st&&st.s?'انتهت فترة التفعيل. أدخل كود التفعيل للمتابعة.':'التطبيق يحتاج كود تفعيل للبدء.'}</p>
      <input id="lic-in" placeholder="ادخل كود التفعيل" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" style="text-align:center">
      <div id="lic-err" class="lic-err"></div>
      <button class="btn pri" id="lic-ok" style="width:100%">تفعيل</button></div>`;
    document.body.appendChild(g);
    const go=()=>{const r=apply(document.getElementById('lic-in').value);
      if(r.ok){g.remove();window.dispatchEvent(new CustomEvent('licchange',{detail:r.msg}))}
      else document.getElementById('lic-err').textContent=r.msg};
    document.getElementById('lic-ok').onclick=go;
    document.getElementById('lic-in').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  }
  function check(){if(!active())gate();else{const g=document.getElementById('lic-gate');g&&g.remove()}}
  function start(){check();setInterval(check,15000);document.addEventListener('visibilitychange',check)}
  return {apply,active,status,check,start};
})();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',Lic.start);else Lic.start();
