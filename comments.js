// Supabase auth + comments. Uses ONLY the public (publishable/anon) key.
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
let client,sub;
const loadLib=()=>window.supabase?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=CDN;s.onload=ok;s.onerror=no;document.head.append(s)});
export async function initComments(box,cfg,T,esc,lang){
  const {url,key,bookId}=cfg;
  if(!url||!key||url.startsWith('YOUR_')){box.innerHTML=`<p class="notice">${esc(T('cNotConf'))}</p>`;return}
  box.innerHTML=`<p>${esc(T('loading'))}</p>`;
  try{await loadLib();client=client||window.supabase.createClient(url,key)}
  catch{box.innerHTML=`<p class="notice err" role="alert">${esc(T('cFail'))}</p>`;return}
  let mode='login';
  const draw=async()=>{
    let session=null,rows=[],loadErr=false;
    try{session=(await client.auth.getSession()).data.session;
      const r=await client.from('comments').select('content,created_at,profiles(display_name)').eq('book_id',bookId).eq('status','approved').order('created_at',{ascending:false}).limit(100);
      if(r.error)throw r.error;rows=r.data}catch{loadErr=true}
    const list=loadErr?`<p class="notice err" role="alert">${esc(T('cFail'))}</p>`:rows.length?rows.map(c=>`<div class="cmt"><small>${esc(c.profiles?.display_name||'—')} · ${esc(new Date(c.created_at).toLocaleDateString(lang))}</small><p>${esc(c.content)}</p></div>`).join(''):`<p>${esc(T('noComments'))}</p>`;
    const form=session
      ?`<form id="cf"><label for="ct">${esc(T('comment'))}</label><textarea id="ct" maxlength="1000" required rows="4"></textarea><div class="act"><button class="btn" type="submit">${esc(T('send'))}</button><button class="btn" type="button" id="lo">${esc(T('logout'))}</button></div><p id="msg" role="status"></p></form>`
      :`<form id="af"><p>${esc(T('signinToComment'))}</p>${mode==='signup'?`<label for="nm">${esc(T('name'))}</label><input id="nm" required maxlength="40" autocomplete="nickname">`:''}<label for="em">${esc(T('email'))}</label><input id="em" type="email" required autocomplete="email" dir="ltr"><label for="pw">${esc(T('password'))}</label><input id="pw" type="password" required minlength="8" autocomplete="${mode==='signup'?'new-password':'current-password'}" dir="ltr"><div class="act"><button class="btn" type="submit">${esc(T(mode))}</button><button class="btn" type="button" id="sw">${esc(T(mode==='login'?'signup':'login'))}</button></div><p id="msg" role="status"></p></form>`;
    box.innerHTML=form+list;
    const msg=(t,e)=>{const m=box.querySelector('#msg');m.textContent=t;m.className=e?'err':''};
    const busy=(b)=>box.querySelectorAll('button').forEach(x=>x.disabled=b);
    box.querySelector('#sw')?.addEventListener('click',()=>{mode=mode==='login'?'signup':'login';draw()});
    box.querySelector('#lo')?.addEventListener('click',async()=>{await client.auth.signOut()});
    box.querySelector('#af')?.addEventListener('submit',async e=>{e.preventDefault();busy(true);msg(T('loading'));
      const email=box.querySelector('#em').value.trim(),password=box.querySelector('#pw').value;
      const r=mode==='signup'?await client.auth.signUp({email,password,options:{data:{display_name:box.querySelector('#nm').value.trim()}}}):await client.auth.signInWithPassword({email,password});
      busy(false);if(r.error)msg(r.error.message,1);else if(mode==='signup'&&!r.data.session)msg(T('confirmEmail'));});
    box.querySelector('#cf')?.addEventListener('submit',async e=>{e.preventDefault();busy(true);msg(T('loading'));
      const content=box.querySelector('#ct').value.trim();
      const r=await client.from('comments').insert({book_id:bookId,content});
      busy(false);if(r.error)msg(r.error.message,1);else{box.querySelector('#ct').value='';msg(T('sent'))}});
  };
  sub?.unsubscribe();
  sub=client.auth.onAuthStateChange((ev)=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT')draw()}).data.subscription;
  await draw();
}
