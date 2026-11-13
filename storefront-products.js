/* Naville: vitrine real. Fonte exclusiva: RPC pública do Supabase. */
(()=>{
 const cfg=window.NAVILLE_SUPABASE||window.NAVILLE_CONFIG||{};
 const url=cfg.url, key=cfg.publishableKey;
 const grid=document.querySelector('#productGrid'), filters=document.querySelector('#filters');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let products=[],selected='Todos';
 const search=document.querySelector('#searchInput');
 function image(p){return p.image_path?`${url.replace(/\/$/,'')}/storage/v1/object/public/product-images/${p.image_path.split('/').map(encodeURIComponent).join('/')}`:null;}
 function renderFilters(){const names=['Todos',...new Set(products.map(p=>p.category_name).filter(Boolean))];filters.replaceChildren();for(const name of names){const b=document.createElement('button');b.className='filter'+(selected===name?' active':'');b.textContent=name;b.onclick=()=>{selected=name;renderFilters();render();};filters.append(b);}}
 function render(){const q=(search?.value||'').trim().toLocaleLowerCase('pt-BR');const shown=products.filter(p=>(selected==='Todos'||p.category_name===selected)&&[p.name,p.brand_name,p.category_name].some(s=>String(s||'').toLocaleLowerCase('pt-BR').includes(q)));
 grid.innerHTML=shown.length?shown.map(p=>{const img=image(p);return `<article class="product-card"><div class="product-image real-product-image">${img?`<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">`:'<span class="no-photo">Imagem indisponível</span>'}<small>${p.available_stock>0?'DISPONÍVEL':'ESGOTADO'}</small></div><div class="product-info"><div class="brand-name">${esc(p.brand_name||'Naville Cosmetics')}</div><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3><a class="product-detail-link" href="product.html?id=${encodeURIComponent(p.id)}">Ver detalhes ↗</a>${p.compare_at_price>p.price?`<del>${brl(p.compare_at_price)}</del> `:''}<strong>${brl(p.price)}</strong><button data-add="${esc(p.id)}" ${p.available_stock<=0?'disabled':''}>${p.available_stock>0?'Adicionar à sacola +':'Indisponível'}</button></div></article>`;}).join(''):'<p>Nenhum produto disponível nesta seleção.</p>';
 grid.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));}
 function add(id){if(window.NavilleCart.add(id,1))window.NavilleCart.open();}
document.querySelector('#searchToggle').onclick=()=>{const b=document.querySelector('#searchbar');b.hidden=!b.hidden;if(!b.hidden)search.focus();};search.oninput=render;document.querySelector('#showAll').onclick=()=>{selected='Todos';renderFilters();render();};document.querySelector('#newsletterForm').onsubmit=e=>{e.preventDefault();document.querySelector('#newsletterMessage').textContent='Cadastro de e-mail ainda não disponível.';};document.querySelector('#year').textContent=new Date().getFullYear();
 window.addEventListener('naville-category-selected',e=>{selected=e.detail.name;renderFilters();render();document.querySelector('#produtos').scrollIntoView({behavior:'smooth'});});
 async function load(){grid.innerHTML='<p>Carregando produtos...</p>';try{if(!url||!key||!window.supabase)throw Error('Supabase não configurado');const db=window.supabase.createClient(url,key);const {data,error}=await db.rpc('naville_public_catalog');if(error)throw error;products=(data||[]).map(p=>({...p,price:Number(p.price),compare_at_price:Number(p.compare_at_price||0),available_stock:Number(p.available_stock||0)}));window.NavilleCart.setCatalog(products);renderFilters();render();}catch(e){console.error('Falha ao carregar catálogo Naville:',e);grid.innerHTML='<p>Não foi possível carregar os produtos. Verifique a conexão e a configuração do catálogo no Supabase.</p>';}}
 load();
})();
