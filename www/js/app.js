let db=Store.load();
let view='home';
let ctx={cat:null,cart:[],edit:false,period:'day',tableId:null,code:'',authed:false,pinv:''};
const A={};
const $=s=>document.querySelector(s);
const uid=Store.uid;
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const fmt=n=>(Math.round((+n||0)*100)/100).toLocaleString('en-US');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isSeller=()=>db.settings.role==='seller';
const save=()=>Store.save(db);
const tm=d=>new Date(d).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
function toast(m){const t=$('#toast');t.textContent=m;t.className='show';clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',2300)}
function applyTheme(){const t=db.settings.theme,r=document.documentElement.style;
  r.setProperty('--bg',t.bg);r.setProperty('--card',t.card);r.setProperty('--accent',t.accent);r.setProperty('--text',t.text);r.setProperty('--bd',t.border);}
function closeM(){$('#modal').innerHTML=''}
function sheet(html){$('#modal').innerHTML=`<div class="ov" data-a="ovClose"><div class="sheet card">${html}</div></div>`}
function form(title,fields,ok){
  sheet(`<h3>${title}</h3>`+fields.map(f=>`<label>${f.l}</label>`+(f.opts
    ?`<select name="${f.k}">${f.opts.map(o=>`<option value="${esc(o[0])}" ${o[0]==f.v?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`
    :`<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v==null?'':f.v)}" ${f.t==='number'?'inputmode="decimal" step="any"':''}>`)).join('')
    +`<div class="row"><button class="btn pri" id="fok">حفظ</button><button class="btn" id="fno">إلغاء</button></div>`);
  $('#fno').onclick=closeM;
  $('#fok').onclick=()=>{const v={};document.querySelectorAll('#modal [name]').forEach(i=>v[i.name]=i.type==='number'?(parseFloat(i.value)||0):i.value.trim());if(ok(v)!==false)closeM()};
}
async function saveFile(name,text){
  const C=window.Capacitor;
  try{
    if(C&&C.isNativePlatform&&C.isNativePlatform()){
      const {Filesystem,Share}=C.Plugins;
      const r=await Filesystem.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
      await Share.share({title:name,url:r.uri});return;
    }
  }catch(e){toast('تعذر المشاركة: '+e.message)}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();
}

/* ============ حسابات ============ */
function rangeStart(p){const d=new Date();if(p==='week')d.setDate(d.getDate()-6);else if(p==='month')d.setDate(1);else if(p==='year')d.setMonth(0,1);return Store.day(d)}
function treasury(){
  const sales=sum(db.invoices,i=>i.total);
  const exp=sum(db.expenses.filter(x=>x.pay==='cash'||x.paid),x=>x.amount);
  const inn=sum(db.moves.filter(m=>m.type==='in'),m=>m.amount);
  const out=sum(db.moves.filter(m=>m.type==='out'),m=>m.amount);
  return {sales,exp,inn,out,opening:db.opening,bal:db.opening+sales+inn-exp-out};
}
const cartRef=()=>ctx.tableId?db.tables.find(t=>t.id===ctx.tableId).items:ctx.cart;
const cartTotal=c=>sum(c,i=>i.price*i.qty);
function makeInvoice(items,src,table){
  db.invNo++;const d=new Date();
  const inv={id:uid(),no:db.invNo,at:d.toISOString(),day:Store.day(d),items:items.map(i=>({...i})),total:cartTotal(items),src,table:table||'',
    seller:isSeller()?(db.settings.sellerName||'بائع'):'owner',sent:false};
  db.invoices.push(inv);save();return inv;
}

/* ============ العرض ============ */
function render(){
  const y=window.scrollY;applyTheme();
  const titles={home:db.settings.name,quick:'البيع السريع',tables:'ترابيزات',table:'الطلب',products:'المنتجات',expenses:'المصروفات',treasury:'الخزنة',reports:'التقارير',invoices:'سجل الفواتير',sync:isSeller()?'الاتصال بالمالك':'تبديل البائع',settings:'الإعدادات'};
  const fn={home:vHome,quick:orderUI,tables:vTables,table:vTable,products:vProducts,expenses:vExpenses,treasury:vTreasury,reports:vReports,invoices:vInvoices,sync:vSync,settings:vSettings}[view];
  const body=fn();
  $('#app').innerHTML=`<div class="top">${view!=='home'?`<div class="icon card" data-a="go" data-v="${view==='table'?'tables':'home'}">→</div>`:''}<h2>${esc(titles[view])}</h2>${view==='home'&&isSeller()?`<span class="badge">بائع: ${esc(db.settings.sellerName)}</span>`:''}</div>`+body;
  window.scrollTo(0,y);
}
function vHome(){
  const d=Store.day(new Date()),ti=db.invoices.filter(i=>i.day===d);
  const sales=sum(ti,i=>i.total),exp=sum(db.expenses.filter(e=>e.day===d),e=>e.amount),open=db.tables.filter(t=>t.items.length).length;
  const st=(l,v,go)=>`<div class="card stat" data-a="go" data-v="${go}"><small>${l}</small><b>${v}</b></div>`;
  const s3=isSeller()?st('مبيعات اليوم',fmt(sales),'invoices')+st('فواتير اليوم',ti.length,'invoices')+st('طلبات مفتوحة',open,'tables')
    :st('مبيعات اليوم',fmt(sales),'reports')+st('المصروفات',fmt(exp),'expenses')+st('طلبات مفتوحة',open,'tables');
  const tl=isSeller()?[['invoices','🧾','سجل الفواتير'],['sync','🔗','الاتصال بالمالك'],['settings','⚙️','الإعدادات']]
    :[['products','📦','المنتجات'],['expenses','💸','المصروفات'],['treasury','🏦','الخزنة'],['reports','📊','التقارير'],['invoices','🧾','سجل الفواتير'],['sync','🔄','تبديل البائع'],['settings','⚙️','الإعدادات']];
  return `<div class="stats">${s3}</div>
  <div class="card wide" data-a="go" data-v="quick"><span>⚡</span>البيع السريع</div>
  <div class="card wide" data-a="go" data-v="tables"><span>🍽️</span>ترابيزات</div>
  <div class="grid">${tl.map(t=>`<div class="card tile" data-a="go" data-v="${t[0]}"><span>${t[1]}</span>${t[2]}</div>`).join('')}</div>`;
}

/* --- واجهة الطلب المشتركة (بيع سريع + ترابيزة) --- */
function orderUI(){
  if(!db.categories.find(c=>c.id===ctx.cat))ctx.cat=db.categories[0]?db.categories[0].id:null;
  const cart=cartRef(),own=!isSeller(),e=ctx.edit&&own;
  const chips=db.categories.map(c=>`<span class="chip ${c.id===ctx.cat?'on':''}" data-a="cat" data-id="${c.id}">${esc(c.name)}${e?`<b data-a="delCat" data-id="${c.id}">✕</b>`:''}</span>`).join('');
  const prods=db.products.filter(p=>p.cat===ctx.cat).map(p=>`<div class="card prod" data-a="add" data-id="${p.id}">${esc(p.name)}<small>${fmt(p.price)}</small>${e?`<b data-a="delProd" data-id="${p.id}">✕</b>`:''}</div>`).join('');
  const rows=cart.map((i,n)=>`<div class="line"><div>${esc(i.name)}<br><small>${fmt(i.price)} × ${i.qty}</small></div>
    <div class="qty"><button class="btn" data-a="dec" data-n="${n}">−</button><b>${i.qty}</b><button class="btn" data-a="inc" data-n="${n}">+</button></div><b>${fmt(i.price*i.qty)}</b></div>`).join('');
  return `<div class="row" style="margin-bottom:6px">${own?`<button class="btn" data-a="addCat">＋ قسم</button><button class="btn" data-a="addProd">＋ صنف</button><button class="btn ${e?'pri':''}" data-a="toggleEdit">${e?'تم':'تعديل / حذف'}</button>`:''}</div>
  <div class="chips">${chips||'<div class="empty">أضف قسماً للبدء</div>'}</div>
  <div class="prods">${prods||'<div class="empty" style="grid-column:1/-1">لا أصناف في هذا القسم</div>'}</div>
  <div class="card pad"><h3>${ctx.tableId?'طلب الترابيزة':'إنشاء الفاتورة'}</h3>${rows||'<div class="empty">اضغط على الأصناف لإضافتها</div>'}
  <div class="total">الإجمالي: ${fmt(cartTotal(cart))}</div>
  <div class="row"><button class="btn pri" data-a="pay">${ctx.tableId?'إصدار الفاتورة وإغلاق الحساب':'حفظ الفاتورة'}</button><button class="btn red" data-a="clearCart">مسح</button></div></div>`;
}
function vTables(){
  return `<button class="btn pri" data-a="addTable" style="margin-bottom:14px;width:100%">＋ ترابيزة جديدة</button><div class="grid">`+
  (db.tables.map(t=>`<div class="card tile" data-a="openTable" data-id="${t.id}"><span>${t.items.length?'🟠':'🟢'}</span>${esc(t.name)}<br><small>${t.items.length?fmt(cartTotal(t.items))+' ج':'فارغة'}</small></div>`).join('')||'<div class="empty" style="grid-column:1/-1">لا توجد ترابيزات</div>')+`</div>`;
}
function vTable(){
  const t=db.tables.find(x=>x.id===ctx.tableId);if(!t){view='tables';return vTables()}
  return `<h3>${esc(t.name)}</h3><div class="row"><button class="btn" data-a="renTable">✏️ تغيير الاسم</button><button class="btn red" data-a="delTable">🗑️ حذف الترابيزة</button></div>`+orderUI();
}
function vProducts(){
  return `<button class="btn pri" data-a="addProd" style="width:100%;margin-bottom:14px">＋ إضافة منتج</button>`+
  (db.categories.map(c=>{const ps=db.products.filter(p=>p.cat===c.id);
    return `<div class="card pad"><h3>${esc(c.name)}</h3>${ps.map(p=>`<div class="line" data-a="editProd" data-id="${p.id}"><div>${esc(p.name)}<br><small>شراء: ${p.cost?fmt(p.cost):'—'}</small></div><b>${fmt(p.price)}</b></div>`).join('')||'<div class="empty">فارغ</div>'}</div>`}).join('')||'<div class="empty">أضف أقساماً من صفحة البيع السريع</div>');
}
function vExpenses(){
  const d=Store.day(new Date()),debt=db.expenses.filter(e=>e.pay==='credit'&&!e.paid);
  const list=[...db.expenses].reverse().map(e=>`<div class="line"><div>${esc(e.reason)} ${e.note?`<small>— ${esc(e.note)}</small>`:''}<br><small>${e.day}</small>
    ${e.pay==='credit'?(e.paid?'<span class="tag">مسدد</span>':`<span class="tag debt">أجل: ${esc(e.creditor)}</span>`):'<span class="tag">نقدي</span>'}</div>
    <div style="text-align:left"><b>${fmt(e.amount)}</b><br>${e.pay==='credit'&&!e.paid?`<button class="btn" data-a="settle" data-id="${e.id}">سداد</button>`:''}<button class="btn red" data-a="delExp" data-id="${e.id}">✕</button></div></div>`).join('');
  return `<div class="stats" style="grid-template-columns:1fr 1fr"><div class="card stat"><small>مصروفات اليوم</small><b>${fmt(sum(db.expenses.filter(e=>e.day===d),e=>e.amount))}</b></div><div class="card stat"><small>ديون غير مسددة</small><b>${fmt(sum(debt,e=>e.amount))}</b></div></div>
  <button class="btn pri" data-a="addExp" style="width:100%">＋ تسجيل مصروف</button>
  <h3 style="margin-top:16px">أسباب المصروفات</h3><div class="chips">${db.reasons.map((r,i)=>`<span class="chip">${esc(r)}<b data-a="delReason" data-n="${i}">✕</b></span>`).join('')}<span class="chip" data-a="addReason">＋ سبب</span></div>
  <div class="card pad">${list||'<div class="empty">لا مصروفات</div>'}</div>`;
}
function vTreasury(){
  const t=treasury(),mv=[...db.moves].reverse().map(m=>`<div class="line"><div>${m.type==='in'?'إيداع':'سحب'} ${m.note?`<small>— ${esc(m.note)}</small>`:''}<br><small>${m.day}</small></div><b style="color:${m.type==='in'?'#1a9d4a':'#d33'}">${m.type==='in'?'+':'−'}${fmt(m.amount)}</b></div>`).join('');
  return `<div class="card pad"><div class="total" style="font-size:30px">${fmt(t.bal)} ج</div><div style="text-align:center;opacity:.6;margin-bottom:10px">الرصيد الحالي في الخزنة</div>
  <div class="line"><span>رصيد افتتاحي</span><b>${fmt(t.opening)}</b></div><div class="line"><span>+ المبيعات (كل البائعين)</span><b>${fmt(t.sales)}</b></div>
  <div class="line"><span>+ إيداعات</span><b>${fmt(t.inn)}</b></div><div class="line"><span>− مصروفات مدفوعة</span><b>${fmt(t.exp)}</b></div><div class="line"><span>− مسحوبات</span><b>${fmt(t.out)}</b></div></div>
  <div class="row"><button class="btn" data-a="opening">ضبط المبلغ الموجود</button><button class="btn" data-a="mv" data-t="in">＋ إيداع</button><button class="btn" data-a="mv" data-t="out">− سحب</button></div>
  <h3 style="margin-top:14px">حركات الخزنة</h3><div class="card pad">${mv||'<div class="empty">لا حركات</div>'}</div>`;
}
function vReports(){
  const s=rangeStart(ctx.period),inv=db.invoices.filter(i=>i.day>=s),ex=db.expenses.filter(e=>e.day>=s);
  const sales=sum(inv,i=>i.total),exp=sum(ex,e=>e.amount);
  const margin=sum(inv,i=>sum(i.items,x=>x.cost>0?(x.price-x.cost)*x.qty:0));
  const by=(arr,kf,vf)=>{const m={};arr.forEach(x=>{const k=kf(x);m[k]=(m[k]||0)+vf(x)});return Object.entries(m)};
  const prod={};inv.forEach(i=>i.items.forEach(x=>{const p=prod[x.name]||(prod[x.name]={q:0,t:0});p.q+=x.qty;p.t+=x.qty*x.price}));
  const L=(a,b)=>`<div class="line"><span>${a}</span><b>${b}</b></div>`;
  const tabs=[['day','اليوم'],['week','الأسبوع'],['month','الشهر'],['year','السنة']];
  return `<div class="tabs">${tabs.map(t=>`<span class="chip ${ctx.period===t[0]?'on':''}" data-a="period" data-p="${t[0]}">${t[1]}</span>`).join('')}</div>
  <div class="card pad"><h3>الملخص</h3>${L('عدد الفواتير',inv.length)}${L('إجمالي المبيعات',fmt(sales))}${L('إجمالي المصروفات',fmt(exp))}${L('الصافي (مبيعات − مصروفات)',fmt(sales-exp))}${L('هامش ربح الأصناف المسجل سعر شرائها',fmt(margin))}</div>
  <div class="card pad"><h3>جرد المنتجات المباعة</h3>${Object.entries(prod).sort((a,b)=>b[1].q-a[1].q).map(([n,p])=>L(esc(n)+' <small>× '+p.q+'</small>',fmt(p.t))).join('')||'<div class="empty">لا مبيعات</div>'}</div>
  <div class="card pad"><h3>المصروفات حسب السبب</h3>${by(ex,e=>e.reason,e=>e.amount).map(([k,v])=>L(esc(k),fmt(v))).join('')||'<div class="empty">لا مصروفات</div>'}</div>
  <div class="card pad"><h3>المبيعات حسب البائع</h3>${by(inv,i=>i.seller==='owner'?'المالك':i.seller,i=>i.total).map(([k,v])=>L(esc(k),fmt(v))).join('')||'<div class="empty">—</div>'}</div>`;
}
function vInvoices(){
  const list=[...db.invoices].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,300);
  return `<div class="card pad">${list.map(i=>`<div class="line" data-a="viewInv" data-id="${i.id}"><div>#${i.no} ${i.table?'· '+esc(i.table):''}<br><small>${i.day} ${tm(i.at)} · ${i.seller==='owner'?'المالك':esc(i.seller)}</small></div><b>${fmt(i.total)}</b></div>`).join('')||'<div class="empty">لا فواتير</div>'}</div>`;
}
function vSettings(){
  const t=db.settings.theme,c=(k,l)=>`<div><label>${l}</label><input type="color" data-c="${k}" value="${t[k]}"></div>`;
  if(isSeller())return `<div class="card pad"><h3>وضع البائع</h3><p>الجهاز مرتبط بالبائع: <b>${esc(db.settings.sellerName)}</b></p><button class="btn red" data-a="exitSeller" style="width:100%">الخروج من وضع البائع (يتطلب رمز المالك)</button></div>`;
  return `<div class="card pad"><h3>اسم الكافيه</h3><input id="cname" value="${esc(db.settings.name)}"><button class="btn pri" data-a="saveName" style="width:100%">حفظ الاسم</button></div>
  <div class="card pad"><h3>الألوان</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${c('bg','الخلفية')}${c('card','المستطيلات')}${c('accent','اللون الأساسي')}${c('text','النص')}${c('border','الحواف')}</div>
  <button class="btn" data-a="resetTheme" style="width:100%">استرجاع الألوان الافتراضية</button></div>
  <div class="card pad"><h3>رمز المالك</h3><p style="font-size:13px;opacity:.7;margin-top:0">يُستخدم لإعادة الضبط والخروج من وضع البائع.</p><button class="btn" data-a="setPin" style="width:100%">تغيير الرمز</button></div>
  <div class="card pad"><h3>النسخ الاحتياطي</h3><div class="row"><button class="btn pri" data-a="backup">تصدير نسخة احتياطية</button><button class="btn" data-a="restore">استرجاع من ملف</button></div><input type="file" id="rf" accept=".json,application/json" style="display:none"></div>
  <div class="card pad"><h3>جهاز البائع</h3><p style="font-size:13px;opacity:.7;margin-top:0">حوّل هذا الجهاز (على هاتف العامل) إلى وضع البيع فقط.</p><button class="btn" data-a="makeSeller" style="width:100%">تحويل الجهاز لوضع البائع</button></div>
  <div class="card pad"><h3>ضبط المصنع</h3><button class="btn red" data-a="factory" style="width:100%">مسح كل البيانات</button></div>`;
}

/* ============ تبديل البائع / المزامنة ============ */
function sellersHTML(){
  const o=sum(db.invoices.filter(i=>i.seller==='owner'),i=>i.total),m={};
  db.invoices.filter(i=>i.seller!=='owner').forEach(i=>{const s=m[i.seller]||(m[i.seller]={n:0,t:0});s.n++;s.t+=i.total});
  const L=(a,b)=>`<div class="line"><span>${a}</span><b>${b}</b></div>`;
  return L('مبيعات المالك',fmt(o))+Object.entries(m).map(([k,v])=>L('مبيعات الفرد الثاني: '+esc(k)+` <small>(${v.n} فاتورة)</small>`,fmt(v.t))).join('')+L('إجمالي الإيراد المضموم للخزنة',fmt(sum(db.invoices,i=>i.total)))+L('رصيد الخزنة',fmt(treasury().bal));
}
function vSync(){
  const dev=Sync.isOpen();
  if(isSeller())return `<div class="card pad"><h3>الاتصال بالمالك</h3>
  <label>كود الاتصال (من المالك)</label><input id="pin" inputmode="numeric" value="${esc(ctx.pinv)}">
  <label>الصق رمز نقطة الاتصال الذي أرسله المالك</label><textarea id="off"></textarea>
  <button class="btn pri" data-a="join" style="width:100%">اتصال</button>
  <label>انسخ هذا الرد وأرسله للمالك</label><textarea id="rep" readonly></textarea><button class="btn" data-a="copy" data-t="rep" style="width:100%">نسخ الرد</button>
  <div class="st" id="st">${dev?'متصل ✔':'غير متصل'}</div>
  <div class="row"><button class="btn pri" data-a="sendSales">إرسال المبيعات الآن</button><button class="btn red" data-a="closeConn">إغلاق الاتصال</button></div>
  <p style="font-size:13px;opacity:.7">فواتير لم تُرسل بعد: <b>${db.invoices.filter(i=>!i.sent).length}</b></p></div>
  <div class="card pad"><h3>بديل بالنص (بدون اتصال)</h3><textarea id="tx"></textarea><div class="row"><button class="btn" data-a="mkTxt">تجهيز مبيعاتي كنص</button><button class="btn" data-a="copy" data-t="tx">نسخ</button><button class="btn" data-a="impTxt">استيراد قائمة المنتجات</button></div></div>`;
  return `<div class="card pad"><h3>1) فتح نقطة اتصال</h3>
  <label>كود الاتصال (يكتبه العامل ليسمح له بالدخول)</label><input id="code" inputmode="numeric" value="${esc(ctx.code||String(Math.floor(1000+Math.random()*9000)))}">
  <button class="btn pri" data-a="host" style="width:100%">إنشاء رمز نقطة الاتصال</button>
  <textarea id="o1" readonly placeholder="سيظهر الرمز هنا — أرسله للعامل"></textarea><button class="btn" data-a="copy" data-t="o1" style="width:100%">نسخ الرمز</button>
  <label>2) الصق رد العامل هنا</label><textarea id="a1"></textarea><button class="btn pri" data-a="link" style="width:100%">ربط</button>
  <div class="st" id="st">${dev?'متصل ✔':'غير متصل'}</div>
  <div class="row"><button class="btn" data-a="push">إرسال المنتجات للعامل</button><button class="btn pri" data-a="pull">سحب المبيعات</button><button class="btn red" data-a="closeConn">إغلاق نقطة الاتصال</button></div></div>
  <div class="card pad"><h3>بديل بالنص (بدون اتصال مباشر)</h3><textarea id="tx" placeholder="الصق هنا مبيعات العامل ثم اضغط استيراد"></textarea><div class="row"><button class="btn" data-a="mkTxt">تجهيز المنتجات كنص</button><button class="btn" data-a="copy" data-t="tx">نسخ</button><button class="btn pri" data-a="impTxt">استيراد مبيعات</button></div></div>
  <div class="card pad"><h3>مبيعات الفرد الثاني والموازنة</h3><div id="sl">${sellersHTML()}</div></div>`;
}
const st=m=>{const e=$('#st');if(e)e.textContent=m};
function importSales(m){
  const have=new Set(db.invoices.map(i=>i.id));let n=0;
  (m.invoices||[]).forEach(i=>{if(!have.has(i.id)){db.invoices.push({...i,seller:m.name||i.seller||'بائع',sent:true});n++}});
  save();return n;
}
function applyConfig(m){db.categories=m.categories||[];db.products=m.products||[];if(m.name)db.settings.name=m.name;save()}
const configMsg=()=>({t:'config',name:db.settings.name,categories:db.categories,products:db.products});
const salesMsg=()=>({t:'sales',name:db.settings.sellerName||'بائع',invoices:db.invoices.filter(i=>!i.sent)});
function wireSync(){
  Sync.onclose=()=>{ctx.authed=false;st('تم إغلاق الاتصال')};
  Sync.onopen=()=>{if(isSeller())Sync.send({t:'hello',code:ctx.pinv,name:db.settings.sellerName})};
  Sync.onmsg=m=>{
    if(isSeller()){
      if(m.t==='ok')st('متصل بالمالك ✔');
      else if(m.t==='deny')st('كود الاتصال غير صحيح ✖');
      else if(m.t==='config'){applyConfig(m);toast('تم تحديث المنتجات من المالك')}
      else if(m.t==='pull'){Sync.send(salesMsg());st('تم إرسال المبيعات')}
      else if(m.t==='ack'){db.invoices.forEach(i=>{if(m.ids.includes(i.id))i.sent=true});save();st('استلم المالك المبيعات ✔')}
    }else{
      if(m.t==='hello'){
        if(String(m.code)!==String(ctx.code)){Sync.send({t:'deny'});setTimeout(()=>Sync.close(),400);st('كود خاطئ — تم الرفض');return}
        ctx.authed=true;Sync.send({t:'ok'});st('متصل بالعامل: '+(m.name||'')+' ✔');
      }else if(m.t==='sales'&&ctx.authed){
        const n=importSales(m);Sync.send({t:'ack',ids:(m.invoices||[]).map(i=>i.id)});
        st(`تم استلام ${n} فاتورة جديدة من ${m.name}`);const e=$('#sl');if(e)e.innerHTML=sellersHTML();
      }
    }
  };
}
wireSync();

/* ============ الأحداث ============ */
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const f=A[el.dataset.a];if(f){if(el.dataset.a!=='ovClose'||e.target===el)f(el.dataset,el)}});
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.c;if(k){db.settings.theme[k]=e.target.value;applyTheme()}});
document.addEventListener('change',e=>{
  if(e.target.dataset&&e.target.dataset.c)save();
  if(e.target.id==='rf'){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.settings||!d.invoices)throw 0;if(confirm('سيتم استبدال كل البيانات الحالية. متابعة؟')){db=Object.assign(Store.defaults(),d);save();view='home';render();toast('تم الاسترجاع')}}catch(x){toast('ملف غير صالح')}};r.readAsText(f)}
});
const R=()=>{save();render()};
Object.assign(A,{
  ovClose:closeM,
  go:d=>{view=d.v;if(view!=='table')ctx.tableId=null;ctx.edit=false;render();window.scrollTo(0,0)},
  cat:d=>{ctx.cat=d.id;render()},
  toggleEdit:()=>{ctx.edit=!ctx.edit;render()},
  addCat:()=>form('قسم جديد',[{k:'name',l:'اسم القسم'}],v=>{if(!v.name)return false;const c={id:uid(),name:v.name};db.categories.push(c);ctx.cat=c.id;R()}),
  delCat:d=>{if(confirm('حذف القسم وكل أصنافه؟')){db.categories=db.categories.filter(c=>c.id!==d.id);db.products=db.products.filter(p=>p.cat!==d.id);R()}},
  addProd:()=>{if(!db.categories.length)return toast('أضف قسماً أولاً');
    form('منتج جديد',[{k:'name',l:'الاسم'},{k:'price',l:'سعر البيع',t:'number'},{k:'cost',l:'سعر الشراء (اختياري - للأرباح)',t:'number'},{k:'cat',l:'القسم',v:ctx.cat,opts:db.categories.map(c=>[c.id,c.name])}],
    v=>{if(!v.name||!v.price){toast('اكتب الاسم والسعر');return false}db.products.push({id:uid(),name:v.name,price:v.price,cost:v.cost,cat:v.cat});ctx.cat=v.cat;R()})},
  editProd:d=>{const p=db.products.find(x=>x.id===d.id);
    form('تعديل منتج',[{k:'name',l:'الاسم',v:p.name},{k:'price',l:'سعر البيع',t:'number',v:p.price},{k:'cost',l:'سعر الشراء',t:'number',v:p.cost},{k:'cat',l:'القسم',v:p.cat,opts:db.categories.map(c=>[c.id,c.name])}],
    v=>{Object.assign(p,v);R()});
    $('#modal .sheet').insertAdjacentHTML('beforeend',`<button class="btn red" data-a="delProd" data-id="${p.id}" style="width:100%">حذف المنتج</button>`)},
  delProd:d=>{if(confirm('حذف الصنف؟')){db.products=db.products.filter(p=>p.id!==d.id);closeM();R()}},
  add:d=>{const p=db.products.find(x=>x.id===d.id),c=cartRef(),l=c.find(i=>i.pid===p.id);l?l.qty++:c.push({pid:p.id,name:p.name,price:p.price,cost:p.cost||0,qty:1});R()},
  inc:d=>{cartRef()[d.n].qty++;R()},
  dec:d=>{const c=cartRef();if(--c[d.n].qty<=0)c.splice(d.n,1);R()},
  clearCart:()=>{const c=cartRef();if(c.length&&confirm('مسح الطلب؟')){c.length=0;R()}},
  pay:()=>{const c=cartRef();if(!c.length)return toast('الفاتورة فارغة');
    const t=ctx.tableId&&db.tables.find(x=>x.id===ctx.tableId);const inv=makeInvoice(c,t?'table':'quick',t&&t.name);c.length=0;R();toast('تم حفظ الفاتورة #'+inv.no+' — '+fmt(inv.total))},
  addTable:()=>form('ترابيزة جديدة',[{k:'name',l:'الاسم / الرقم',v:'ترابيزة '+(db.tables.length+1)}],v=>{if(!v.name)return false;db.tables.push({id:uid(),name:v.name,items:[]});R()}),
  openTable:d=>{ctx.tableId=d.id;view='table';render();window.scrollTo(0,0)},
  renTable:()=>{const t=db.tables.find(x=>x.id===ctx.tableId);form('اسم الترابيزة',[{k:'name',l:'الاسم',v:t.name}],v=>{if(v.name){t.name=v.name;R()}})},
  delTable:()=>{if(confirm('حذف الترابيزة؟')){db.tables=db.tables.filter(x=>x.id!==ctx.tableId);ctx.tableId=null;view='tables';R()}},
  addReason:()=>form('سبب جديد',[{k:'name',l:'السبب'}],v=>{if(!v.name)return false;db.reasons.push(v.name);R()}),
  delReason:d=>{db.reasons.splice(d.n,1);R()},
  addExp:()=>form('مصروف جديد',[{k:'reason',l:'السبب',opts:db.reasons.map(r=>[r,r])},{k:'amount',l:'المبلغ',t:'number'},{k:'pay',l:'طريقة الدفع',opts:[['cash','نقدي'],['credit','أجل']]},{k:'creditor',l:'اسم الدائن (إذا أجل — أنا مديون لمين)'},{k:'note',l:'ملاحظة'}],
    v=>{if(!v.amount){toast('اكتب المبلغ');return false}if(v.pay==='credit'&&!v.creditor){toast('اكتب اسم الدائن');return false}
      db.expenses.push({id:uid(),day:Store.day(),reason:v.reason||'أخرى',amount:v.amount,pay:v.pay,creditor:v.creditor,note:v.note,paid:false});R()}),
  settle:d=>{if(confirm('تسجيل السداد (يخصم من الخزنة)؟')){const x=db.expenses.find(e=>e.id===d.id);x.paid=true;R()}},
  delExp:d=>{if(confirm('حذف المصروف؟')){db.expenses=db.expenses.filter(e=>e.id!==d.id);R()}},
  opening:()=>form('المبلغ الموجود معك (رصيد افتتاحي)',[{k:'a',l:'المبلغ',t:'number',v:db.opening}],v=>{db.opening=v.a;R()}),
  mv:d=>form(d.t==='in'?'إيداع في الخزنة':'سحب من الخزنة',[{k:'a',l:'المبلغ',t:'number'},{k:'n',l:'ملاحظة'}],v=>{if(!v.a)return false;db.moves.push({id:uid(),day:Store.day(),type:d.t,amount:v.a,note:v.n});R()}),
  period:d=>{ctx.period=d.p;render()},
  viewInv:d=>{const i=db.invoices.find(x=>x.id===d.id);
    sheet(`<h3>فاتورة #${i.no} ${i.table?'· '+esc(i.table):''}</h3><small>${i.day} ${tm(i.at)} · ${i.seller==='owner'?'المالك':esc(i.seller)}</small>${i.items.map(x=>`<div class="line"><span>${esc(x.name)} × ${x.qty}</span><b>${fmt(x.price*x.qty)}</b></div>`).join('')}<div class="total">${fmt(i.total)}</div><div class="row"><button class="btn" data-a="ovClose">إغلاق</button>${isSeller()?'':`<button class="btn red" data-a="delInv" data-id="${i.id}">حذف الفاتورة</button>`}</div>`)},
  delInv:d=>{if(confirm('حذف الفاتورة؟')){db.invoices=db.invoices.filter(i=>i.id!==d.id);closeM();R()}},
  saveName:()=>{const v=$('#cname').value.trim();if(v){db.settings.name=v;R();toast('تم الحفظ')}},
  resetTheme:()=>{db.settings.theme={...Store.THEME};R()},
  setPin:()=>form('رمز المالك الجديد',[{k:'p',l:'الرمز'}],v=>{if(v.p.length<3){toast('الرمز قصير');return false}db.settings.pin=v.p;R();toast('تم التغيير')}),
  backup:()=>saveFile('cafe-backup-'+Store.day()+'.json',JSON.stringify(db)),
  restore:()=>$('#rf').click(),
  factory:()=>form('ضبط المصنع — اكتب رمز المالك',[{k:'p',l:'الرمز'}],v=>{if(v.p!==db.settings.pin){toast('الرمز غير صحيح');return false}if(!confirm('سيتم مسح كل شيء نهائياً. متأكد؟'))return false;db=Store.defaults();view='home';R();toast('تم ضبط المصنع')}),
  makeSeller:()=>form('تحويل الجهاز لوضع البائع',[{k:'n',l:'اسم البائع'},{k:'p',l:'رمز الخروج من هذا الوضع (احتفظ به عندك)'}],v=>{if(!v.n||!v.p){toast('املأ الحقلين');return false}db.settings.role='seller';db.settings.sellerName=v.n;db.settings.pin=v.p;view='home';R()}),
  exitSeller:()=>form('الخروج من وضع البائع',[{k:'p',l:'رمز المالك'}],v=>{if(v.p!==db.settings.pin){toast('الرمز غير صحيح');return false}db.settings.role='owner';view='home';R()}),
  copy:async d=>{const e=$('#'+d.t);e.select();try{await navigator.clipboard.writeText(e.value)}catch(x){document.execCommand('copy')}toast('تم النسخ')},
  host:async()=>{ctx.code=$('#code').value.trim();if(!ctx.code)return toast('اكتب كود الاتصال');st('جاري إنشاء الرمز...');wireSync();
    try{$('#o1').value=await Sync.host();st('أرسل الرمز للعامل ثم الصق ردّه');}catch(x){st('تعذر الإنشاء: '+x.message)}},
  link:async()=>{try{await Sync.acceptAnswer($('#a1').value);st('جاري الربط...')}catch(x){st('الرد غير صالح')}},
  join:async()=>{ctx.pinv=$('#pin').value.trim();wireSync();st('جاري الاتصال...');
    try{$('#rep').value=await Sync.join($('#off').value);st('أرسل الرد للمالك وانتظر الاتصال')}catch(x){st('الرمز غير صالح')}},
  push:()=>{if(!ctx.authed)return toast('لا يوجد عامل متصل');Sync.send(configMsg());toast('تم إرسال المنتجات')},
  pull:()=>{if(!ctx.authed)return toast('لا يوجد عامل متصل');Sync.send({t:'pull'});st('جاري سحب المبيعات...')},
  sendSales:()=>{if(!Sync.isOpen())return toast('غير متصل');Sync.send(salesMsg());st('تم إرسال المبيعات')},
  closeConn:()=>{Sync.close();ctx.authed=false;st('تم إغلاق نقطة الاتصال')},
  mkTxt:()=>{$('#tx').value=Sync.enc(isSeller()?salesMsg():configMsg())},
  impTxt:()=>{try{const m=Sync.dec($('#tx').value);
    if(m.t==='config'&&isSeller()){applyConfig(m);toast('تم تحديث المنتجات')}
    else if(m.t==='sales'&&!isSeller()){const n=importSales(m);toast('تم استلام '+n+' فاتورة');const e=$('#sl');if(e)e.innerHTML=sellersHTML()}
    else toast('النص لا يناسب هذا الجهاز')}catch(x){toast('نص غير صالح')}}
});
render();
