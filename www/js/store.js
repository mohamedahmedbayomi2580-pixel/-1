const Store=(()=>{
  const KEY='cafe_pos_v1';
  const THEME={bg:'#ffffff',card:'#ffffff',accent:'#2f7df6',text:'#2b2f38',border:'#d9d9d9'};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const day=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const defaults=()=>({
    settings:{name:'الكافيه',role:'owner',sellerName:'',pin:'1234',theme:{...THEME}},
    categories:[{id:uid(),name:'مشروبات ساخنة'},{id:uid(),name:'مشروبات باردة'},{id:uid(),name:'وجبات'}],
    products:[],tables:[],invoices:[],expenses:[],
    reasons:['إيجار','صيانة','منتجات','كهرباء','مياه','إنترنت','هاتف'],
    moves:[],opening:0,invNo:0
  });
  const load=()=>{
    try{const r=JSON.parse(localStorage.getItem(KEY));if(r){const d=defaults();return {...d,...r,settings:{...d.settings,...r.settings,theme:{...THEME,...(r.settings&&r.settings.theme)}}}}}catch(e){}
    return defaults();
  };
  const save=db=>localStorage.setItem(KEY,JSON.stringify(db));
  return {THEME,uid,day,defaults,load,save};
})();
