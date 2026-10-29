/* طبقة التخزين: SQLite داخل ذاكرة الهاتف (عبر @capacitor-community/sqlite)
   - داخل تطبيق الأندرويد: قاعدة SQLite حقيقية في تخزين التطبيق على الهاتف
   - في المتصفح (للتجربة فقط): localStorage
   التطبيق يشتغل على كائن db في الذاكرة، وكل حفظ يكتب الصفوف المتغيرة فقط في القاعدة. */
const Store=(()=>{
  const KEY='cafe_pos_v1', DB='cafe_pos';
  const THEME={bg:'#ffffff',card:'#ffffff',accent:'#2f7df6',accentText:'#ffffff',text:'#2b2f38',muted:'#7a8190',border:'#dcdfe4',shadowDark:'#000000',shadowLight:'#ffffff',good:'#1a9d4a',bad:'#d93a3a',depth:14,radius:20};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const day=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const defaults=()=>({
    settings:{name:'الكافيه',role:'owner',sellerName:'',pin:'1234',theme:{...THEME}},
    categories:[{id:uid(),name:'مشروبات ساخنة'},{id:uid(),name:'مشروبات باردة'},{id:uid(),name:'وجبات'}],
    products:[],tables:[],invoices:[],expenses:[],
    reasons:['إيجار','صيانة','منتجات','كهرباء','مياه','إنترنت','هاتف'],
    moves:[],opening:0,invNo:0
  });
  const merge=r=>{const d=defaults();return {...d,...r,settings:{...d.settings,...r.settings,theme:{...THEME,...(r.settings&&r.settings.theme)}}}};

  const SCHEMA=`
  CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, ord INTEGER, name TEXT);
  CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, ord INTEGER, name TEXT, price REAL, cost REAL, cat TEXT);
  CREATE TABLE IF NOT EXISTS cafe_tables(id TEXT PRIMARY KEY, ord INTEGER, name TEXT, items TEXT);
  CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY, no INTEGER, at TEXT, day TEXT, total REAL, seller TEXT, src TEXT, tbl TEXT, sent INTEGER, items TEXT);
  CREATE INDEX IF NOT EXISTS idx_inv_day ON invoices(day);
  CREATE TABLE IF NOT EXISTS expenses(id TEXT PRIMARY KEY, day TEXT, reason TEXT, amount REAL, pay TEXT, creditor TEXT, note TEXT, paid INTEGER);
  CREATE TABLE IF NOT EXISTS moves(id TEXT PRIMARY KEY, day TEXT, type TEXT, amount REAL, note TEXT);`;

  /* وصف الجداول: cols = الأعمدة (الأول مفتاح) ، row = كائن→قيم ، obj = صف→كائن */
  const SPEC={
    kv:{cols:['k','v'],get:db=>[['settings',JSON.stringify(db.settings)],['opening',String(db.opening)],['invNo',String(db.invNo)],['reasons',JSON.stringify(db.reasons)]],row:x=>x},
    categories:{cols:['id','ord','name'],get:db=>db.categories,key:'categories',order:'ord',
      row:(x,i)=>[x.id,i,x.name],obj:r=>({id:r.id,name:r.name})},
    products:{cols:['id','ord','name','price','cost','cat'],get:db=>db.products,key:'products',order:'ord',
      row:(x,i)=>[x.id,i,x.name,+x.price||0,+x.cost||0,x.cat||''],obj:r=>({id:r.id,name:r.name,price:r.price,cost:r.cost,cat:r.cat})},
    cafe_tables:{cols:['id','ord','name','items'],get:db=>db.tables,key:'tables',order:'ord',
      row:(x,i)=>[x.id,i,x.name,JSON.stringify(x.items||[])],obj:r=>({id:r.id,name:r.name,items:JSON.parse(r.items||'[]')})},
    invoices:{cols:['id','no','at','day','total','seller','src','tbl','sent','items'],get:db=>db.invoices,key:'invoices',order:'at, no',
      row:x=>[x.id,+x.no||0,x.at,x.day,+x.total||0,x.seller||'owner',x.src||'',x.table||'',x.sent?1:0,JSON.stringify(x.items||[])],
      obj:r=>({id:r.id,no:r.no,at:r.at,day:r.day,total:r.total,seller:r.seller,src:r.src,table:r.tbl,sent:!!r.sent,items:JSON.parse(r.items||'[]')})},
    expenses:{cols:['id','day','reason','amount','pay','creditor','note','paid'],get:db=>db.expenses,key:'expenses',order:'id',
      row:x=>[x.id,x.day,x.reason||'',+x.amount||0,x.pay||'cash',x.creditor||'',x.note||'',x.paid?1:0],
      obj:r=>({id:r.id,day:r.day,reason:r.reason,amount:r.amount,pay:r.pay,creditor:r.creditor,note:r.note,paid:!!r.paid})},
    moves:{cols:['id','day','type','amount','note'],get:db=>db.moves,key:'moves',order:'id',
      row:x=>[x.id,x.day,x.type,+x.amount||0,x.note||''],obj:r=>({id:r.id,day:r.day,type:r.type,amount:r.amount,note:r.note})}
  };


  /* ===== نسخة تلقائية في مجلد ظاهر على الهاتف (Documents/CafePOS) ===== */
  const FOLDER='CafePOS',FILE='cafe_pos_backup.json';
  let dirUsed=null,lastMirror=null,mirrorErr=null,mirrorTimer=null;
  const FS=()=>{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.Filesystem||null};
  const DIRS=['DOCUMENTS','EXTERNAL'];
  async function writeSnap(db){
    const fs=FS();if(!fs)return;const data=JSON.stringify(db);
    for(const directory of (dirUsed?[dirUsed]:DIRS)){
      try{
        try{await fs.mkdir({path:FOLDER,directory,recursive:true})}catch(e){}
        await fs.writeFile({path:FOLDER+'/'+FILE,data,directory,encoding:'utf8',recursive:true});
        dirUsed=directory;lastMirror=new Date();mirrorErr=null;return;
      }catch(e){mirrorErr=e&&e.message||String(e)}
    }
    dirUsed=null;
  }
  async function readSnap(){
    const fs=FS();if(!fs)return null;
    for(const directory of DIRS){try{const r=await fs.readFile({path:FOLDER+'/'+FILE,directory,encoding:'utf8'});const j=JSON.parse(r.data);if(j&&j.settings)return j}catch(e){}}
    return null;
  }
  function scheduleMirror(db){if(!FS())return;clearTimeout(mirrorTimer);mirrorTimer=setTimeout(()=>writeSnap(db),6000)}
  const folderPath=()=>dirUsed==='DOCUMENTS'?'Documents/'+FOLDER:dirUsed==='EXTERNAL'?'Android/data/com.cafe.pos/files/'+FOLDER:'—';
  async function mirrorNow(db){await writeSnap(db);if(!dirUsed)throw new Error(mirrorErr||'تعذر الكتابة في المجلد');return folderPath()}
  const info=()=>({mode,path:folderPath(),last:lastMirror,err:mirrorErr});

  let SQL=null,sigs={},latest=null,running=false,pending=false,mode='متصفح (تجربة فقط)';
  const nativeSQL=()=>{const C=window.Capacitor;
    if(!(C&&C.isNativePlatform&&C.isNativePlatform()))return null;
    return (C.Plugins&&C.Plugins.CapacitorSQLite)||(C.registerPlugin&&C.registerPlugin('CapacitorSQLite'))||null};
  const rows=async(sql)=>{const r=await SQL.query({database:DB,statement:sql,values:[]});return (r.values||[]).filter(x=>x&&!x.ios_columns)};

  /* كتابة الفروقات فقط */
  async function persist(db){
    const set=[];
    for(const [t,s] of Object.entries(SPEC)){
      const m=sigs[t]||(sigs[t]=new Map()),seen=new Set();
      s.get(db).forEach((x,i)=>{
        const v=s.row(x,i),k=v[0],sg=JSON.stringify(v);seen.add(k);
        if(m.get(k)!==sg){
          set.push({statement:`INSERT OR REPLACE INTO ${t}(${s.cols.join(',')}) VALUES(${s.cols.map(()=>'?').join(',')})`,values:v});
          m.set(k,sg);
        }
      });
      for(const k of [...m.keys()])if(!seen.has(k)){set.push({statement:`DELETE FROM ${t} WHERE ${s.cols[0]}=?`,values:[k]});m.delete(k)}
    }
    if(set.length)await SQL.executeSet({database:DB,set,transaction:true});
  }
  async function run(){
    running=true;
    try{do{pending=false;await persist(latest)}while(pending)}
    catch(e){console.error(e);sigs={};window.dispatchEvent(new CustomEvent('dberror',{detail:e}))}
    running=false;
  }
  function save(db){
    if(!SQL){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){window.dispatchEvent(new CustomEvent('dberror',{detail:e}))}return}
    latest=db;scheduleMirror(db);if(running){pending=true;return}run();
  }

  async function init(){
    SQL=nativeSQL();
    if(!SQL){try{const r=JSON.parse(localStorage.getItem(KEY));if(r)return merge(r)}catch(e){}return defaults()}
    mode='SQLite (ذاكرة الهاتف)';
    try{const fs=FS();fs&&fs.requestPermissions&&await fs.requestPermissions()}catch(e){}
    try{await SQL.createConnection({database:DB,version:1,encrypted:false,mode:'no-encryption',readonly:false})}catch(e){}
    await SQL.open({database:DB,readonly:false});
    await SQL.execute({database:DB,statements:SCHEMA,transaction:false});
    const kv=await rows('SELECT k,v FROM kv');
    if(!kv.length){
      /* أول تشغيل: ترحيل من التخزين القديم (localStorage) إن وُجد */
      let d=defaults();
      try{const r=JSON.parse(localStorage.getItem(KEY));if(r)d=merge(r)}catch(e){}
      const snap=await readSnap();if(snap)d=merge(snap);   /* استرجاع تلقائي من مجلد الهاتف بعد إعادة التثبيت */
      latest=d;await persist(d);return d;
    }
    const out=defaults(),m={};kv.forEach(r=>m[r.k]=r.v);
    out.settings=merge({settings:JSON.parse(m.settings||'{}')}).settings;
    out.opening=parseFloat(m.opening)||0;out.invNo=parseInt(m.invNo)||0;
    out.reasons=JSON.parse(m.reasons||'[]');
    for(const [t,s] of Object.entries(SPEC)){
      if(!s.key)continue;
      out[s.key]=(await rows(`SELECT * FROM ${t} ORDER BY ${s.order}`)).map(s.obj);
    }
    /* تهيئة البصمات كي لا يُعاد كتابة ما هو محفوظ */
    sigs={};
    for(const [t,s] of Object.entries(SPEC)){const mm=sigs[t]=new Map();s.get(out).forEach((x,i)=>{const v=s.row(x,i);mm.set(v[0],JSON.stringify(v))})}
    return out;
  }
  return {THEME,uid,day,defaults,merge,init,save,info,mirrorNow,readSnap,get mode(){return mode}};
})();
