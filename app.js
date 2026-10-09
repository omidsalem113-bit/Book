import{initComments}from'./comments.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
const LANGS={fa:'فارسی',en:'English'},RTL=['fa'];
const ORDER=['intro','summary','perspective','analysis','notes','quotes','characters','context','research','discussion','sources'];
const SPIRAL='<svg class="spiral" viewBox="0 0 100 62" aria-hidden="true"><path d="M0 62A62 62 0 0 1 62 0A38 38 0 0 1 100 38A24 24 0 0 1 76 62A15 15 0 0 1 61 47A9 9 0 0 1 70 38A6 6 0 0 1 64 44"/></svg>';
let lang=LANGS[ls.get('lang')]?ls.get('lang'):'fa',D={},B={},quotes=[];const revealed=new Set();
const other=()=>Object.keys(LANGS).find(l=>l!==lang);
const T=k=>D[lang]?.ui?.[k]??D[other()]?.ui?.[k]??'';
const say=m=>{$('#live').textContent='';setTimeout(()=>$('#live').textContent=m,50)};
const paras=a=>(a||[]).map(x=>`<p>${esc(x)}</p>`).join('');
function getSec(id){
  if(id==='discussion')return{s:{title:T('discussion')}};
  const a=D[lang]?.sections?.[id];if(a)return{s:a};
  const b=D[other()]?.sections?.[id];return b?{s:b,fb:1}:{};
}
const avail=id=>!(B.hidden||[]).includes(id)&&(id==='discussion'||(()=>{const s=getSec(id).s;return s&&!(Array.isArray(s.items)&&!s.items.length)})());
const R={
  perspective:s=>`<div class="mine"><span class="lbl">${esc(T('mine'))}</span>${paras(s.p)}</div>`,
  analysis:s=>(s.items||[]).map(i=>`<h3>${esc(i.h)}</h3>${paras(i.p)}`).join(''),
  notes:s=>(s.items||[]).map(i=>`<p class="hl" tabindex="0" role="button" aria-pressed="false">${esc(i.text)}</p>`).join(''),
  quotes:s=>{quotes=s.items||[];return quotes.map((q,i)=>`<figure class="q" id="q${i}"><blockquote dir="auto">${esc(q.text)}</blockquote><figcaption>${esc(q.loc||'')}</figcaption>${q.comment?`<p>${esc(q.comment)}</p>`:''}<div class="act"><button class="btn small" data-copy="${i}">${esc(T('copy'))}</button><button class="btn small" data-share="quotes/${i}">${esc(T('share'))}</button></div></figure>`).join('')},
  characters:s=>(s.items||[]).map(i=>`<div class="card"><b>${esc(i.name)}</b><br><small>${esc(i.role||'')}</small><p>${esc(i.note||'')}</p></div>`).join(''),
  research:s=>(s.items||[]).map(i=>{const d=i.status==='reviewed';return`<div class="card"><b>${esc(i.q)}</b><span class="st ${d?'done':'todo'}">${esc(T(d?'reviewed':'needs'))}</span>${i.why?`<p>${esc(i.why)}</p>`:''}${i.note?`<p>${esc(i.note)}</p>`:''}${(i.src||[]).length?`<ul>${i.src.map(x=>`<li><small>${esc(x)}</small></li>`).join('')}</ul>`:''}</div>`}).join(''),
  sources:s=>`<ul>${(s.items||[]).map(x=>`<li class="card">${esc(x)}</li>`).join('')}</ul>`
};
async function init(){
  try{[B,D.fa,D.en]=await Promise.all(['book','fa','en'].map(n=>fetch(`content/${n}.json`).then(r=>{if(!r.ok)throw 0;return r.json()})))}
  catch{$('#view').textContent='Content failed to load. محتوا بارگذاری نشد.';$('#intro').remove();return}
  $('#lang').addEventListener('click',()=>setLang(other()));
  $('#home-btn').addEventListener('click',()=>{location.hash='';render()});
  $('#toc-btn').addEventListener('click',()=>{const t=$('#toc');t.hidden=!t.hidden;$('#toc-btn').setAttribute('aria-expanded',String(!t.hidden))});
  addEventListener('hashchange',render);
  addEventListener('keydown',e=>{if(e.key==='Escape')closeToc()});
  $('#view').addEventListener('click',onClick);
  $('#view').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('hl')){e.preventDefault();e.target.click()}});
  setLang(lang);startIntro();
}
function setLang(l){
  lang=l;ls.set('lang',l);const h=document.documentElement;h.lang=l;h.dir=RTL.includes(l)?'rtl':'ltr';
  const o=$('#lang');o.textContent=LANGS[other()];o.lang=other();o.setAttribute('aria-label',T('langLabel'));
  $('#toc-btn').textContent=T('contents');$('#home-btn').textContent=T('home');document.title=D[l].title;render();
}
function closeToc(){$('#toc').hidden=true;$('#toc-btn').setAttribute('aria-expanded','false')}
function render(){
  const parts=location.hash.replace(/^#\/?/,'').split('/'),id=parts[0],v=$('#view');closeToc();
  if(ORDER.includes(id)&&avail(id))section(id,v,parts[1]);else{home(v);scrollTo(0,0)}
  $('#toc').innerHTML=`<ul>${ORDER.filter(avail).map(i=>`<li><a href="#/${i}"${i===id?' aria-current="page"':''}>${esc(getSec(i).s.title)}</a></li>`).join('')}</ul>`;
}
function home(v){
  const d=D[lang],f=D[other()];
  const orig=d.original&&d.original!==d.title?d.original:(f.original!==d.title?f.original:'');
  v.innerHTML=`<section class="home">${SPIRAL}<p class="meta">${esc(d.author)}</p><h1>${esc(d.title)}</h1>${orig?`<p class="orig" lang="en" dir="ltr">${esc(orig)}</p>`:''}${d.translator?`<p class="meta">${esc(T('translator'))}: ${esc(d.translator)}</p>`:''}${d.pub?`<p class="meta">${esc(d.pub)}</p>`:''}${B.cover?`<img src="${esc(B.cover)}" alt="${esc(d.coverAlt||d.title)}" loading="lazy" onerror="this.remove()">`:''}<p class="tag">${esc(d.tagline||'')}</p>${B.rating!=null?`<p class="rate"><span class="stars" style="--r:${+B.rating}" role="img" aria-label="${(+B.rating).toLocaleString(lang)} / ${(5).toLocaleString(lang)}">★★★★★</span><span>${(+B.rating).toLocaleString(lang)} / ${(5).toLocaleString(lang)} — ${esc(T('rating'))}</span></p>`:''}<ul class="toc-list">${ORDER.filter(avail).map(i=>`<li><a href="#/${i}">${esc(getSec(i).s.title)}</a></li>`).join('')}</ul></section>`;
}
function section(id,v,sub){
  const{s,fb}=getSec(id);let body;
  if(id==='discussion')body='<div id="cbox"></div>';
  else if(s.spoiler&&!revealed.has(id))body=`<div class="gate"><p>${esc(T('spoilerTitle'))}</p><button class="btn" data-reveal="${id}">${esc(T('spoilerBtn'))}</button></div>`;
  else body=(R[id]||(x=>paras(x.p)))(s);
  v.innerHTML=`<article><button class="back" data-nav>${esc(T('home'))}</button><h2>${esc(s.title)}</h2>${fb?`<p class="notice">${esc(T('missing'))}</p>`:''}${body}<div class="act"><button class="btn small" data-share="${id}">${esc(T('share'))}</button></div></article>`;
  if(id==='discussion')initComments($('#cbox'),{...B.supabase,bookId:B.id},T,esc,lang);
  const q=sub!=null&&$('#q'+sub);
  if(q){q.scrollIntoView({block:'center'});q.classList.add('flash')}else scrollTo(0,0);
}
async function copyText(t){try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';document.body.append(a);a.select();try{document.execCommand('copy')}catch{}a.remove()}}
async function share(path,btn){
  const url=location.href.split('#')[0]+'#/'+path;
  if(navigator.share){try{await navigator.share({title:D[lang].title,url});return}catch(e){if(e.name==='AbortError')return}}
  await copyText(url);flash(btn,T('linkCopied'));
}
function flash(btn,msg){const o=btn.textContent;btn.textContent=msg;say(msg);setTimeout(()=>btn.textContent=o,1600)}
async function onClick(e){
  const t=e.target.closest('[data-copy],[data-share],[data-reveal],[data-nav],.hl');if(!t)return;
  if(t.dataset.nav!==undefined){location.hash='';render()}
  else if(t.dataset.reveal){revealed.add(t.dataset.reveal);render()}
  else if(t.dataset.copy!==undefined){await copyText(quotes[+t.dataset.copy].text);flash(t,T('copied'))}
  else if(t.dataset.share)share(t.dataset.share,t);
  else if(t.classList.contains('hl')&&!getSelection().toString()){t.classList.toggle('on');t.setAttribute('aria-pressed',String(t.classList.contains('on')))}
}
function startIntro(){
  const el=$('#intro');if(ls.get('seen')){el.remove();return}
  el.innerHTML=`${SPIRAL}<h1>${esc(D[lang].title)}</h1><button class="btn" id="enter">${esc(T('enter'))}</button>`;
  const go=()=>{ls.set('seen','1');el.classList.add('out');setTimeout(()=>{el.remove();$('#view').focus({preventScroll:true})},650)};
  $('#enter').addEventListener('click',go);$('#enter').focus();
  addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.contains(el))go()});
}
init();
