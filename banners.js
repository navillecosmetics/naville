// Carrossel demonstrativo: armazenamento local, sem sincronização entre dispositivos.
const BANNER_KEY='naville-demo-banners-v1';
const BANNER_DEFAULT=[{id:'banner-original',title:'Boas-vindas Naville',link:'#produtos',alt:'O seu ritual de beleza começa aqui',active:true,image:''}];
function getBanners(){try{const x=JSON.parse(localStorage.getItem(BANNER_KEY));return Array.isArray(x)?x:BANNER_DEFAULT.map(b=>({...b}));}catch{return BANNER_DEFAULT.map(b=>({...b}));}}
function saveBanners(b){localStorage.setItem(BANNER_KEY,JSON.stringify(b));window.dispatchEvent(new Event('naville-banners-updated'));}
function bannerLink(value){const v=String(value||'').trim();if(v.startsWith('#')&&/^#[\w-]+$/.test(v))return v;try{const u=new URL(v,location.href);if(['https:','http:'].includes(u.protocol))return u.href;}catch{}return '#produtos';}
function bannerImage(value){return typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)?value:'';}
function makeOriginalSlide(){const el=document.createElement('div');el.className='hero banner-original';el.innerHTML='<div class="hero-copy"><div class="eyebrow">NAVILLE COSMETICS · MULTIMARCAS</div><h1>O seu ritual de beleza começa aqui.</h1><p>Uma seleção especial de cuidados, descobertas e favoritos para acompanhar cada versão de você.</p><a class="button dark" href="#produtos">Explorar a seleção <span>↗</span></a></div><div class="hero-art"><div class="orb orb-one"></div><div class="orb orb-two"></div><img src="assets/isotipo.png" alt="Símbolo da Naville"><div class="hero-label">BEAUTY, CURATED.</div></div>';return el;}
function initBannerCarousel(){
 const host=document.querySelector('#bannerSlides');if(!host)return;
 const carousel=host.closest('.banner-carousel'),dots=document.querySelector('#bannerDots');
 const prev=document.querySelector('#bannerPrev'),next=document.querySelector('#bannerNext');
 let current=0,timer=null,animating=false,touchX=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function positionSlides(){[...host.children].forEach((el,j)=>{
   el.style.transition='none';el.style.transform=`translateX(${j===current?0:100}%)`;
   el.classList.toggle('is-active',j===current);
   el.setAttribute('aria-hidden',String(j!==current));
   el.style.visibility=j===current?'visible':'hidden';
 });updateDots();}
 function updateDots(){[...dots.children].forEach((el,j)=>{
   el.classList.toggle('is-active',j===current);
   el.setAttribute('aria-current',String(j===current));
 });}
 function show(target,direction){
  const slides=[...host.children],n=slides.length;if(!n||animating)return;
  const nextIndex=(target+n)%n;if(nextIndex===current)return;
  const from=slides[current],to=slides[nextIndex],dir=direction||1;
  if(reduced()) {current=nextIndex;positionSlides();return;}
  animating=true;
  to.style.transition='none';to.style.visibility='visible';to.style.transform=`translateX(${dir*100}%)`;
  to.classList.add('is-active');to.setAttribute('aria-hidden','false');
  void to.offsetWidth;
  const transition='transform 600ms cubic-bezier(.22,.61,.36,1)';
  from.style.transition=transition;to.style.transition=transition;
  from.style.transform=`translateX(${-dir*100}%)`;to.style.transform='translateX(0%)';
  current=nextIndex;updateDots();
  const finish=()=>{animating=false;positionSlides();};
  to.addEventListener('transitionend',function onEnd(e){if(e.target!==to||e.propertyName!=='transform')return;to.removeEventListener('transitionend',onEnd);finish();},{once:false});
 }
 function restart(){clearInterval(timer);if(host.children.length>1&&!reduced())timer=setInterval(()=>show(current+1,1),5500);}
 function render(){clearInterval(timer);animating=false;const list=getBanners().filter(b=>b.active);
  host.replaceChildren();dots.replaceChildren();if(current>=list.length)current=0;
  if(!list.length){const el=document.createElement('div');el.className='banner-empty';el.textContent='Em breve, novas campanhas.';host.append(el);}
  list.forEach((b,i)=>{let slide;if(!b.image&&b.id==='banner-original')slide=makeOriginalSlide();else{
    slide=document.createElement('a');slide.className='banner-image-slide';slide.href=bannerLink(b.link);
    const img=document.createElement('img');img.src=bannerImage(b.image)||'assets/isotipo.png';img.alt=b.alt||b.title||'Banner promocional';slide.append(img);
  }slide.classList.add('banner-slide');host.append(slide);
   const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label','Ir para banner '+(i+1));
   dot.onclick=()=>{const diff=i-current;show(i,diff>=0?1:-1);restart();};dots.append(dot);
  });positionSlides();prev.hidden=list.length<2;next.hidden=list.length<2;dots.hidden=list.length<2;restart();
 }
 prev.onclick=()=>{show(current-1,-1);restart();};next.onclick=()=>{show(current+1,1);restart();};
 carousel.addEventListener('mouseenter',()=>clearInterval(timer));carousel.addEventListener('mouseleave',restart);
 carousel.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.screenX??null;},{passive:true});
 carousel.addEventListener('touchend',e=>{if(touchX===null)return;const dx=(e.changedTouches[0]?.screenX??touchX)-touchX;touchX=null;if(Math.abs(dx)>45){show(current+(dx<0?1:-1),dx<0?1:-1);restart();}},{passive:true});
 window.addEventListener('storage',e=>{if(e.key===BANNER_KEY)render();});
 window.addEventListener('naville-banners-updated',render);render();
}
function initBannerAdmin(){const form=document.querySelector('#bannerForm');if(!form)return;const list=document.querySelector('#bannerList'),msg=document.querySelector('#bannerMessage');let banners=getBanners();function clear(){form.reset();form.elements.id.value='';document.querySelector('#bannerFormTitle').textContent='Adicionar banner';msg.textContent='';}function render(){banners=getBanners();list.replaceChildren();if(!banners.length){list.textContent='Nenhum banner cadastrado.';return;}banners.forEach((b,i)=>{const row=document.createElement('div');row.className='banner-admin-item';const preview=document.createElement('div');preview.className='banner-admin-preview';if(b.image){const img=document.createElement('img');img.src=bannerImage(b.image);img.alt='';preview.append(img);}else preview.textContent='Banner original';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=b.title;const detail=document.createElement('small');detail.textContent=(b.active?'Ativo':'Inativo')+' · '+b.link;info.append(title,detail);const actions=document.createElement('div');actions.className='admin-actions';function btn(label,fn){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=fn;actions.append(el);}btn('Editar',()=>{form.elements.id.value=b.id;form.elements.title.value=b.title;form.elements.link.value=b.link;form.elements.alt.value=b.alt||'';form.elements.active.value=b.active?'yes':'no';document.querySelector('#bannerFormTitle').textContent='Editar banner';msg.textContent='Para manter a imagem atual, deixe o campo de arquivo vazio.';form.scrollIntoView({behavior:'smooth'});});btn('↑',()=>move(i,-1));btn('↓',()=>move(i,1));btn('Excluir',()=>{if(confirm('Excluir este banner?')){banners.splice(i,1);persist();}});row.append(preview,info,actions);list.append(row);});}function persist(){try{saveBanners(banners);render();}catch{msg.textContent='Não foi possível salvar. O armazenamento do navegador pode estar cheio; use imagens menores.';}}function move(i,dir){const j=i+dir;if(j<0||j>=banners.length)return;[banners[i],banners[j]]=[banners[j],banners[i]];persist();}form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),id=String(fd.get('id')||'banner-'+Date.now()),title=String(fd.get('title')||'').trim(),link=String(fd.get('link')||'').trim();if(!title||!link||bannerLink(link)==='#produtos'&&link!=='#produtos'){msg.textContent='Informe um título e um link válido (https://... ou #seção).';return;}const old=banners.find(b=>b.id===id);let image=old?.image||'';const file=form.elements.image.files[0];if(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){msg.textContent='Use JPG, PNG ou WebP de até 2 MB.';return;}image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}if(!image&&id!=='banner-original'){msg.textContent='Selecione uma imagem para o banner.';return;}const b={id,title,link,alt:String(fd.get('alt')||''),active:fd.get('active')==='yes',image};if(old)Object.assign(old,b);else banners.push(b);persist();clear();};document.querySelector('#bannerCancel').onclick=clear;window.addEventListener('storage',e=>{if(e.key===BANNER_KEY)render();});render();}
initBannerCarousel();
