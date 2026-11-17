/* Naville — cadastro manual no Supabase. Executado somente após login administrativo. */
window.setupNavilleProducts = async function(db) {
 const host=document.querySelector('#productsView');
 if(!host || host.dataset.cloudReady)return;
 host.dataset.cloudReady='1';
 host.innerHTML=`<div id="npListHeader" class="np-list-header"><div><div class="np-breadcrumb">Produtos &nbsp; › &nbsp; Lista de produtos</div><h1>Lista de produtos</h1></div><button type="button" id="npNewProduct" class="np-new-button">+ Adicionar produto</button></div>
 <div id="npEditorHeader" hidden><button type="button" id="npBackProducts" class="np-back-button">← Voltar para produtos</button><h1 id="npPageTitle">Novo produto</h1></div>
 <div id="npFilters" class="admin-panel np-filter-panel"><div class="np-filter-title">Todos filtros</div><div class="np-filter-grid">
 <label>Código ou referência<input id="npFilterCode" type="search" placeholder="Pesquisar código"></label>
 <label>Nome do produto<input id="npFilterName" type="search" placeholder="Pesquisar produto"></label>
 <label>Status<select id="npFilterStatus"><option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
 <label>Categoria<select id="npFilterCategory"><option value="">Todas</option></select></label>
 <label>Preço mínimo (R$)<input id="npFilterMin" type="number" min="0" step="0.01" placeholder="R$"></label>
 <label>Preço máximo (R$)<input id="npFilterMax" type="number" min="0" step="0.01" placeholder="R$"></label>
 </div><div class="np-filter-bottom"><span id="npResultCount"></span><button type="button" id="npClearFilters">Limpar filtros</button></div></div>
 <div id="npEditorPanel" class="admin-panel" hidden><h2 id="npTitle">Novo produto</h2><form id="npForm" class="admin-form">
 <input name="id" type="hidden"><label>Nome do produto<input name="name" required maxlength="100"></label>
 <label>Marca (opcional)<select name="brand_id"></select></label><label>Categoria<select name="category_id" required></select></label>
 <label>Descrição<textarea name="description" rows="3"></textarea></label>
 <label>SKU (opcional, único quando informado)<input name="sku" maxlength="80"></label><label>EAN / código de barras (opcional)<input name="ean" maxlength="30"></label>
 <label>Apresentação / variação<input name="variant_name" required placeholder="Ex.: 250 ml, tom 01, padrão"></label>
 <div class="np-price-column"><label>Preço (R$)<input name="price" type="number" min="0.01" step="0.01" required></label>
 <div class="np-discount-control"><label class="np-discount-toggle"><span>Desconto</span><input name="discount_enabled" type="checkbox" role="switch"><span class="np-switch-track" aria-hidden="true"></span></label><label id="npDiscountField" hidden>Valor com desconto (R$)<input name="discount_price" type="number" min="0.01" step="0.01" disabled></label></div>
 <label>Custo de compra (R$)<input name="cost_price" type="number" min="0" step="0.01"></label></div>
 <label>Peso (gramas)<input name="weight_grams" type="number" min="1" step="1"></label>
 <label>Estoque físico inicial (somente no cadastro)<input name="initial_stock" type="number" min="0" step="1" value="0"></label>
 <label>Ativo na loja<select name="is_active"><option value="false">Não — rascunho</option><option value="true">Sim</option></select></label>
 <label>Destaque<select name="is_featured"><option value="false">Não</option><option value="true">Sim</option></select></label>
 <div class="span2 np-gallery-field"><span>Fotos do produto (JPG, PNG ou WebP, até 5 MB por imagem)</span><div id="npGallery" class="np-gallery" aria-label="Galeria de imagens do produto"></div><input id="npImagesInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><p class="np-gallery-help">Arraste as imagens ou clique para adicionar. Selecione uma foto para torná-la principal.</p></div>
 <div class="span2 admin-actions"><button type="submit" id="npSave">Salvar produto</button><button type="button" id="npCancel">Limpar / cancelar</button></div></form><p id="npMessage" role="status" class="admin-sub"></p></div>
 <div id="npListPanel" class="admin-panel"><h2>Produtos cadastrados</h2><div id="npRows"></div></div>`;
 const f=host.querySelector('#npForm'),message=host.querySelector('#npMessage');let cache=[];
 let gallery=[],removedImageIds=[];
 const galleryStyles=document.createElement('style');galleryStyles.textContent=`
 .np-gallery-field{display:block}.np-gallery-field>span{display:block;margin-bottom:10px}
 .np-gallery{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch}
 .np-gallery-card,.np-gallery-add{position:relative;width:132px;height:132px;border-radius:12px;box-sizing:border-box;overflow:hidden}
 .np-gallery-card{border:1px solid #d9dedb;background:#f6f7f5}
 .np-gallery-card img{width:100%;height:100%;object-fit:cover}
 .np-gallery-card.is-primary{outline:2px solid #91a88b;outline-offset:2px}
 .np-gallery-tag{position:absolute;top:6px;left:6px;background:#f6d78a;color:#28251d;border-radius:5px;padding:4px 6px;font-size:11px}
 .np-gallery-tools{position:absolute;bottom:5px;left:5px;right:5px;display:flex;gap:4px}
 .np-gallery-tools button{font:inherit;font-size:10px;padding:5px 6px;border-radius:5px;border:1px solid #d8dcda;background:#fff;color:#20211f;cursor:pointer;flex:1}
 .np-gallery-add{border:2px dashed #b9bfbd;background:#f3f4f3;color:#535c5a;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;cursor:pointer;text-align:center;font:inherit;font-size:12px}
 .np-gallery-add strong{font-size:26px;font-weight:400;color:#8a9294}.np-gallery-add:hover,.np-gallery-add.dragging{background:#e9efeb;border-color:#7e9b87}
 .np-gallery-help{font-size:12px;color:#69716e;margin:8px 0 0}
 /* Upload principal: mesma proporção, fundo branco e contorno tracejado da referência */
 #productsView .np-gallery{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
 #productsView .np-gallery-add{appearance:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;width:160px;height:160px;min-width:160px;padding:16px!important;box-sizing:border-box;border:3px dashed #999!important;border-radius:26px!important;background:#fff!important;background-image:none!important;color:#222!important;box-shadow:none!important;text-align:center!important;cursor:pointer;font-family:inherit!important;font-size:14px!important;line-height:1.4!important;transition:border-color .15s ease,background-color .15s ease}
 #productsView .np-gallery-add.np-gallery-add--empty{width:150px!important;height:150px!important;min-width:150px!important;border:3px dashed #999!important;border-radius:18px!important;gap:5px!important;padding:9px!important}
 #productsView .np-gallery-add .np-upload-icon{width:27px;height:27px;display:block;color:#959ca7}
 #productsView .np-gallery-add .np-upload-title{font-weight:600;font-size:16px;color:#20211f}
 #productsView .np-gallery-add.np-gallery-add--empty .np-upload-title{font-size:13px;line-height:1.25}
 #productsView .np-gallery-add .np-upload-instruction{font-size:13px;color:#555}
 #productsView .np-gallery-add.np-gallery-add--empty .np-upload-instruction{font-size:10px;line-height:1.3}
 #productsView .np-gallery-add .np-upload-instruction b{color:#328dff;font-weight:600}
 #productsView .np-gallery-add:hover,#productsView .np-gallery-add.dragging{background:#f9faf9!important;border-color:#777!important}
 #productsView .np-gallery-card{width:150px;height:150px}
 @media(max-width:540px){#productsView .np-gallery-add.np-gallery-add--empty{width:150px!important;height:150px!important;border-radius:18px!important}}
 
 `;host.append(galleryStyles);
 const fileInput=host.querySelector('#npImagesInput'),galleryRoot=host.querySelector('#npGallery');
 const getImageUrl=path=>db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
 const clearGallery=()=>{for(const g of gallery)if(g.preview)URL.revokeObjectURL(g.preview);gallery=[];removedImageIds=[];renderGallery();};
 function renderGallery(){
  galleryRoot.replaceChildren();
  gallery.forEach((g,i)=>{
   const card=document.createElement('div');card.className='np-gallery-card'+(g.primary?' is-primary':'');
   const img=document.createElement('img');img.src=g.preview||getImageUrl(g.storage_path);img.alt='Imagem '+(i+1);card.append(img);
   if(g.primary){const tag=document.createElement('span');tag.className='np-gallery-tag';tag.textContent='Principal';card.append(tag);}
   const tools=document.createElement('div');tools.className='np-gallery-tools';
   if(!g.primary){const main=document.createElement('button');main.type='button';main.textContent='Tornar principal';main.onclick=()=>{gallery.forEach(x=>x.primary=false);g.primary=true;renderGallery();};tools.append(main);}
   const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.setAttribute('aria-label','Remover imagem '+(i+1));remove.onclick=()=>{if(g.id)removedImageIds.push(g.id);if(g.preview)URL.revokeObjectURL(g.preview);gallery.splice(i,1);if(g.primary&&gallery.length)gallery[0].primary=true;renderGallery();};tools.append(remove);
   card.append(tools);galleryRoot.append(card);
  });
  const add=document.createElement('button');add.type='button';add.className='np-gallery-add';
  add.classList.toggle('np-gallery-add--empty',gallery.length===0);
  add.innerHTML='<svg class="np-upload-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="4" y="7" width="31" height="29" rx="3" fill="currentColor"/><path d="M7 31l9-10 7 7 5-5 6 8" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><circle cx="26" cy="16" r="3" fill="white"/><circle cx="36" cy="35" r="10" fill="white"/><path d="M36 28v14M29 35h14" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg><span class="np-upload-title">Adicionar imagem</span><span class="np-upload-instruction"><b>Clique para enviar</b> ou arraste e solte</span>';
  add.onclick=()=>fileInput.click();
  for(const eventName of ['dragenter','dragover'])add.addEventListener(eventName,e=>{e.preventDefault();add.classList.add('dragging');});
  add.addEventListener('dragleave',()=>add.classList.remove('dragging'));
  add.addEventListener('drop',e=>{e.preventDefault();add.classList.remove('dragging');addFiles(e.dataTransfer.files);});
  galleryRoot.append(add);
 }
 function addFiles(files){
  const incoming=Array.from(files||[]);
  for(const file of incoming){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){message.textContent='Cada imagem deve ser JPG, PNG ou WebP e ter até 5 MB.';continue;}
   gallery.push({file,preview:URL.createObjectURL(file),primary:gallery.length===0});
  }
  renderGallery();
 }
 fileInput.onchange=()=>{addFiles(fileInput.files);fileInput.value='';};
 renderGallery();
 const discountToggle=f.elements.discount_enabled,discountField=host.querySelector('#npDiscountField'),discountInput=f.elements.discount_price;
 const discountStyle=document.createElement('style');discountStyle.textContent=`
 .np-price-column{display:flex;flex-direction:column;gap:14px;min-width:0}.np-price-column>label{display:flex;flex-direction:column;gap:7px}
 .np-discount-control{display:flex;flex-direction:column;gap:10px;justify-content:center}
 .np-discount-toggle{display:flex!important;flex-direction:row!important;align-items:center;gap:12px;cursor:pointer}
 .np-discount-toggle input{position:absolute;opacity:0;width:1px;height:1px}
 .np-switch-track{display:inline-block;width:40px;height:23px;background:#d7dcd8;border-radius:20px;position:relative;transition:background .15s}
 .np-switch-track:after{content:"";position:absolute;left:3px;top:3px;width:17px;height:17px;background:white;border-radius:50%;transition:transform .15s}
 .np-discount-toggle input:checked+.np-switch-track{background:#91a88b}
 .np-discount-toggle input:checked+.np-switch-track:after{transform:translateX(17px)}
 .np-discount-toggle input:focus-visible+.np-switch-track{outline:2px solid #20211f;outline-offset:3px}
 #npDiscountField[hidden]{display:none!important}
 `;host.append(discountStyle);
 function syncDiscount(){const on=discountToggle.checked;discountField.hidden=!on;discountInput.disabled=!on;discountInput.required=on;if(!on)discountInput.value='';}
 discountToggle.addEventListener('change',syncDiscount);syncDiscount();
 const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const query=async(p)=>{const {data,error}=await p;if(error)throw Error(error.message);return data;};
 const val=(name)=>f.elements[name].value.trim();
 const optionalNum=name=>val(name)===''?null:Number(val(name));
 const confirmProductRemoval=(productName)=>new Promise(resolve=>{
  const overlay=document.createElement('div');
  overlay.setAttribute('role','presentation');
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  const panel=document.createElement('div');
  panel.setAttribute('role','alertdialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','navilleDeleteTitle');panel.setAttribute('aria-describedby','navilleDeleteDesc');
  panel.style.cssText='background:#fff;color:#20211f;width:min(100%,440px);border-radius:18px;padding:30px;box-shadow:0 18px 60px rgba(0,0,0,.18);box-sizing:border-box;font-family:inherit;';
  const title=document.createElement('h2');title.id='navilleDeleteTitle';title.textContent='Excluir produto?';title.style.cssText='font-size:27px;line-height:1.2;font-weight:500;margin:0 0 14px;';
  const desc=document.createElement('p');desc.id='navilleDeleteDesc';desc.style.cssText='font-size:14px;line-height:1.6;margin:0 0 24px;color:#51534e;';
  const strong=document.createElement('strong');strong.textContent=productName;desc.append('Deseja excluir ',strong,'? O produto será retirado da loja e da listagem administrativa. O histórico será preservado no banco de dados.');
  const actions=document.createElement('div');actions.style.cssText='display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.style.cssText='padding:12px 20px;border:1px solid #d6d9d0;background:#fff;color:#222;border-radius:9px;cursor:pointer;font:inherit;';
  const accept=document.createElement('button');accept.type='button';accept.textContent='Excluir produto';accept.style.cssText='padding:12px 20px;border:1px solid #20211f;background:#20211f;color:#fff;border-radius:9px;cursor:pointer;font:inherit;';
  actions.append(cancel,accept);panel.append(title,desc,actions);overlay.append(panel);
  const prior=document.activeElement;
  const finish=(yes)=>{document.removeEventListener('keydown',keyHandler,true);overlay.remove();if(prior&&prior.isConnected)prior.focus();resolve(yes);};
  const keyHandler=e=>{if(e.key==='Escape'){e.preventDefault();finish(false);}else if(e.key==='Tab'){const target=e.shiftKey?accept:cancel;if(document.activeElement===(e.shiftKey?cancel:accept)){e.preventDefault();target.focus();}}};
  cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);overlay.onclick=e=>{if(e.target===overlay)finish(false);};
  document.addEventListener('keydown',keyHandler,true);document.body.append(overlay);cancel.focus();
 });
  const requestStockQuantity=(productName,current,reserved)=>new Promise(resolve=>{
   const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
   const panel=document.createElement('form');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','navilleStockTitle');panel.style.cssText='background:#fff;color:#20211f;width:min(100%,440px);border-radius:18px;padding:30px;box-shadow:0 18px 60px rgba(0,0,0,.18);box-sizing:border-box;font-family:inherit;display:flex;flex-direction:column;gap:12px;';
   const title=document.createElement('h2');title.id='navilleStockTitle';title.textContent='Alterar estoque';title.style.cssText='font-size:27px;line-height:1.2;font-weight:500;margin:0 0 4px;';
   const info=document.createElement('p');info.textContent=productName+' — estoque atual: '+current+' unidade(s). Reservado: '+reserved+'.';info.style.cssText='font-size:14px;color:#51534e;margin:0 0 4px;line-height:1.5;';
   const label=document.createElement('label');label.textContent='Nova quantidade total em estoque';label.style.cssText='display:flex;flex-direction:column;gap:7px;font-size:14px;';
   const input=document.createElement('input');input.type='number';input.min=String(reserved);input.step='1';input.required=true;input.value=String(current);input.style.cssText='width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6d9d0;border-radius:9px;background:#fff;color:#20211f;font:inherit;';label.append(input);
   const error=document.createElement('p');error.setAttribute('role','alert');error.style.cssText='font-size:13px;color:#9b2525;margin:0;';
   const actions=document.createElement('div');actions.style.cssText='display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:8px;';
   const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.style.cssText='padding:12px 20px;border:1px solid #d6d9d0;background:#fff;color:#222;border-radius:9px;cursor:pointer;font:inherit;';
   const save=document.createElement('button');save.type='submit';save.textContent='Salvar estoque';save.style.cssText='padding:12px 20px;border:1px solid #20211f;background:#20211f;color:#fff;border-radius:9px;cursor:pointer;font:inherit;';
   actions.append(cancel,save);panel.append(title,info,label,error,actions);overlay.append(panel);
   const prior=document.activeElement;
   const finish=value=>{document.removeEventListener('keydown',onKey,true);overlay.remove();if(prior?.isConnected)prior.focus();resolve(value);};
   const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(null);}if(e.key==='Tab'){const focusable=[input,cancel,save];const i=focusable.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();save.focus();}else if(!e.shiftKey&&i===2){e.preventDefault();input.focus();}}};
   cancel.onclick=()=>finish(null);overlay.onclick=e=>{if(e.target===overlay)finish(null);};
   panel.onsubmit=e=>{e.preventDefault();const value=Number(input.value);if(input.value.trim()===''||!Number.isSafeInteger(value)||value<reserved){error.textContent='Informe uma quantidade inteira igual ou superior ao estoque reservado ('+reserved+').';return;}finish({quantity:value});};
   document.addEventListener('keydown',onKey,true);document.body.append(overlay);input.focus();input.select();
  });
 const editorPanel=host.querySelector('#npEditorPanel'),editorHeader=host.querySelector('#npEditorHeader'),listHeader=host.querySelector('#npListHeader'),filtersPanel=host.querySelector('#npFilters'),listPanel=host.querySelector('#npListPanel');
 const pageStyle=document.createElement('style');pageStyle.textContent=`
 #productsView .np-list-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0 0 24px}
 #productsView .np-list-header h1{margin:6px 0 0;font:600 29px/1.2 Arial,sans-serif}
 #productsView .np-breadcrumb{font:13px Arial,sans-serif;color:#929caa}
 #productsView .np-new-button{background:#1478df;color:#fff;border:0;border-radius:5px;padding:13px 18px;cursor:pointer;font:600 14px Arial,sans-serif}
 #productsView .np-filter-panel{padding:22px 24px;margin-bottom:20px;background:#fff}
 #productsView .np-filter-title{color:#1478df;font:600 14px Arial,sans-serif;border-bottom:1px solid #dce2e8;padding-bottom:13px;margin-bottom:20px}
 #productsView .np-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 22px}
 #productsView .np-filter-grid label{font:13px Arial,sans-serif;display:flex;flex-direction:column;gap:8px;color:#303b4a}
 #productsView .np-filter-grid input,#productsView .np-filter-grid select{box-sizing:border-box;width:100%;min-height:38px;padding:8px 10px;border:1px solid #cdd5df;border-radius:5px;background:#fff;font:13px Arial,sans-serif;color:#273443}
 #productsView .np-filter-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:16px;font:12px Arial,sans-serif;color:#6d7885}
 #productsView .np-filter-bottom button,#productsView .np-back-button{border:1px solid #d8dedb;border-radius:7px;padding:9px 13px;background:#fff;color:#20211f;cursor:pointer}
 #productsView #npEditorHeader{margin-bottom:20px}
 #productsView #npEditorHeader h1{font:600 28px Arial,sans-serif;margin:16px 0}
 #productsView [hidden]{display:none!important}
 @media(max-width:800px){#productsView .np-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:540px){#productsView .np-filter-grid{grid-template-columns:1fr}#productsView .np-list-header{align-items:flex-start;flex-direction:column}}
 `;host.append(pageStyle);
 function showProductScreen(screen){const editing=screen==='editor';editorPanel.hidden=!editing;editorHeader.hidden=!editing;listHeader.hidden=editing;filtersPanel.hidden=editing;listPanel.hidden=editing;host.scrollIntoView({behavior:'smooth',block:'start'});}
 host.querySelector('#npNewProduct').onclick=()=>{reset();host.querySelector('#npPageTitle').textContent='Novo produto';showProductScreen('editor');};
 host.querySelector('#npBackProducts').onclick=()=>{reset();showProductScreen('list');};
 const filterEls=['npFilterCode','npFilterName','npFilterStatus','npFilterCategory','npFilterMin','npFilterMax'].map(id=>host.querySelector('#'+id));
 function applyProductFilters(){
  const [code,name,status,cat,min,max]=filterEls.map(e=>e.value.trim());
  let count=0;
  host.querySelectorAll('#npRows tbody tr').forEach(row=>{
   const p=cache.find(x=>x.id===row.dataset.productId);
   if(!p)return;
   const sku=(p.sku||p.variant?.sku||'').toLocaleLowerCase('pt-BR');
   const matches=(!code||sku.includes(code.toLocaleLowerCase('pt-BR')))
    &&(!name||p.name.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')))
    &&(!status||(status==='active' ? p.is_active : !p.is_active))
    &&(!cat||p.category_id===cat)
    &&(!min||Number(p.price)>=Number(min))
    &&(!max||Number(p.price)<=Number(max));
   row.hidden=!matches;if(matches)count++;
  });
  host.querySelector('#npResultCount').textContent=count+' produto(s) encontrado(s)';
 }
 filterEls.forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',applyProductFilters));
 host.querySelector('#npClearFilters').onclick=()=>{filterEls.forEach(el=>el.value='');applyProductFilters();};
  const reset=()=>{clearGallery();f.reset();syncDiscount();f.elements.id.value='';host.querySelector('#npTitle').textContent='Novo produto';f.elements.initial_stock.disabled=false;message.textContent='';};
 host.querySelector('#npCancel').onclick=()=>{reset();showProductScreen('list');};
 async function choices(){const [brands,cats]=await Promise.all([query(db.from('brands').select('id,name').order('name')),query(db.from('categories').select('id,name').order('name'))]);for(const [name,items] of [['brand_id',brands],['category_id',cats]]){const sel=f.elements[name],prior=sel.value;sel.replaceChildren(new Option('Selecione...', ''));for(const x of items)sel.add(new Option(x.name,x.id));sel.value=prior;}}
 async function refresh(){await choices();const [ps,vs,stocks,images,brands,cats]=await Promise.all([query(db.from('products').select('id,name,brand_id,category_id,description,sku,ean,price,compare_at_price,cost_price,weight_grams,is_active,is_featured,created_at,deleted_at').is('deleted_at',null).order('created_at',{ascending:false})),query(db.from('product_variants').select('id,product_id,name,sku,price,ean')),query(db.from('inventory').select('variant_id,quantity_on_hand,quantity_reserved')),query(db.from('product_images').select('id,product_id,storage_path,is_primary,display_order')),query(db.from('brands').select('id,name')),query(db.from('categories').select('id,name'))]);
 cache=ps.map(p=>({...p,variant:vs.find(v=>v.product_id===p.id),image:images.find(i=>i.product_id===p.id&&i.is_primary)||images.find(i=>i.product_id===p.id),brand:brands.find(b=>b.id===p.brand_id)?.name||'—',category:cats.find(c=>c.id===p.category_id)?.name||'—',variantCount:vs.filter(v=>v.product_id===p.id).length}));
 const stockMap=new Map(stocks.map(s=>[s.variant_id,s]));
 const root=host.querySelector('#npRows');
 const categoryFilter=host.querySelector('#npFilterCategory'),previousCategory=categoryFilter.value;
 categoryFilter.replaceChildren(new Option('Todas',''));
 cats.forEach(c=>categoryFilter.add(new Option(c.name,c.id)));
 categoryFilter.value=previousCategory;
 if(!document.getElementById('navilleProductTableStyles')){const style=document.createElement('style');style.id='navilleProductTableStyles';style.textContent=`
 .np-table-wrap{width:100%;overflow-x:auto}.np-product-table{width:100%;border-collapse:collapse;min-width:980px;font:inherit;color:#29302d}
 .np-product-table th{padding:14px 10px;text-align:left;font-size:12px;font-weight:600;color:#5e6871;border-bottom:1px solid #dce0df;white-space:nowrap}
 .np-product-table td{padding:12px 10px;border-bottom:1px solid #e5e8e7;vertical-align:middle;font-size:13px}
 .np-product-table .np-product-info{display:flex;align-items:center;gap:15px;min-width:230px}
 .np-product-table .np-photo{width:70px;height:82px;flex:0 0 70px;object-fit:cover;background:#f0f0ed;border-radius:3px}
 .np-product-table .np-photo-missing{width:70px;height:82px;display:grid;place-items:center;background:#f1f1ed;color:#8b918d;font-size:11px;text-align:center}
 .np-product-table .np-product-name{font-weight:500;line-height:1.4}.np-product-table .np-variants{display:inline-block;background:#edf0f2;padding:4px 7px;border-radius:4px;margin-top:7px;font-size:11px;color:#53606a}
 .np-product-table .np-price-old{display:block;text-decoration:line-through;color:#8c9298;font-size:12px}.np-product-table .np-price-current{font-weight:500;white-space:nowrap}
 .np-product-table .np-discount{font-size:11px;background:#e9eef7;border-radius:3px;padding:3px 5px;margin-left:5px;color:#495c76}
 .np-product-table .np-status{border:0;border-radius:5px;padding:9px 12px;font-size:12px;font-weight:600;cursor:pointer;min-width:90px}
 .np-product-table .np-status.active{background:#18a88a;color:#fff}.np-product-table .np-status.inactive{background:#e8ecea;color:#505b56}
 .np-product-table .np-status:disabled{opacity:.55;cursor:wait}
 .np-product-table .np-actions{display:flex;gap:6px;flex-wrap:wrap}.np-product-table .np-actions button{appearance:none;padding:10px 13px;font-size:12px;font-weight:400;line-height:1.25;border:1px solid #e1e3e0;border-radius:9px;background:#fff;color:#20211f;box-shadow:none;white-space:nowrap;cursor:pointer;transition:border-color .15s ease,background-color .15s ease}.np-product-table .np-actions button:hover:not(:disabled){background:#f8f8f6;border-color:#c9ceca}.np-product-table .np-actions button:focus-visible{outline:2px solid #8b9f83;outline-offset:2px}.np-product-table .np-actions button:disabled{opacity:.5;cursor:not-allowed}
 .np-product-table input[type=checkbox]{accent-color:#20211f;width:15px;height:15px}
 `;document.head.append(style);}
 const table=document.createElement('table');table.className='np-product-table';
 table.innerHTML='<thead><tr><th><input type="checkbox" aria-label="Selecionar todos os produtos" class="np-select-all"></th><th>Código</th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Vendas</th><th>Status</th><th>Ações</th></tr></thead>';
 const body=document.createElement('tbody');const checks=[];
 const cell=(tr,text)=>{const td=document.createElement('td');td.textContent=text;tr.append(td);return td;};
 for(const p of cache){
  const tr=document.createElement('tr');tr.dataset.productId=p.id;const stock=stockMap.get(p.variant?.id);
  const checkTd=document.createElement('td');const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Selecionar '+p.name);checks.push(check);checkTd.append(check);tr.append(checkTd);
  cell(tr,p.sku||p.variant?.sku||'—');
  const productTd=document.createElement('td'),info=document.createElement('div');info.className='np-product-info';
  if(p.image?.storage_path){const img=document.createElement('img');img.className='np-photo';img.alt='Foto de '+p.name;img.loading='lazy';img.src=db.storage.from('product-images').getPublicUrl(p.image.storage_path).data.publicUrl;img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('div'),{className:'np-photo-missing',textContent:'Sem imagem'}));};info.append(img);}else{const missing=document.createElement('div');missing.className='np-photo-missing';missing.textContent='Sem imagem';info.append(missing);}
  const details=document.createElement('div'),name=document.createElement('div');name.className='np-product-name';name.textContent=p.name;details.append(name);
  if(p.variantCount>1){const variants=document.createElement('span');variants.className='np-variants';variants.textContent=p.variantCount+' variações';details.append(variants);}info.append(details);productTd.append(info);tr.append(productTd);
  cell(tr,p.category);
  const priceTd=document.createElement('td');const old=Number(p.compare_at_price),price=Number(p.price);
  if(old>price){const oldLabel=document.createElement('span');oldLabel.className='np-price-old';oldLabel.textContent=money(old);priceTd.append(oldLabel);}
  const now=document.createElement('span');now.className='np-price-current';now.textContent=money(price);priceTd.append(now);
  if(old>price){const discount=document.createElement('span');discount.className='np-discount';discount.textContent=((old-price)/old*100).toFixed(2).replace('.',',')+'%';priceTd.append(discount);}tr.append(priceTd);
  const productVariants=vs.filter(v=>v.product_id===p.id);const productStock=productVariants.reduce((sum,v)=>sum+Number(stockMap.get(v.id)?.quantity_on_hand||0),0);const reserved=productVariants.reduce((sum,v)=>sum+Number(stockMap.get(v.id)?.quantity_reserved||0),0);
  const stockTd=cell(tr,productVariants.length?String(productStock):'—');if(reserved){const reservedLabel=document.createElement('small');reservedLabel.textContent=' ('+reserved+' reservado)';stockTd.append(reservedLabel);}
  cell(tr,'—'); // Sem registros de pedidos confirmados: não simular vendas.
  const statusTd=document.createElement('td'),status=document.createElement('button');status.type='button';status.className='np-status '+(p.is_active?'active':'inactive');status.textContent=p.is_active?'Ativo ▾':'Inativo ▾';status.title='Clique para '+(p.is_active?'desativar':'ativar')+' este produto';
  status.onclick=async()=>{status.disabled=true;const next=!p.is_active;try{const changed=await query(db.from('products').update({is_active:next}).eq('id',p.id).is('deleted_at',null).select('id,is_active').single());p.is_active=changed.is_active;status.className='np-status '+(p.is_active?'active':'inactive');status.textContent=p.is_active?'Ativo ▾':'Inativo ▾';status.title='Clique para '+(p.is_active?'desativar':'ativar')+' este produto';if(f.elements.id.value===p.id)f.elements.is_active.value=String(p.is_active);message.textContent='Produto '+(p.is_active?'ativado':'desativado')+' com sucesso.';}catch(e){message.textContent='Não foi possível alterar o status: '+e.message;}finally{status.disabled=false;}};
  statusTd.append(status);tr.append(statusTd);
  const td=document.createElement('td'),actions=document.createElement('div');actions.className='np-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{reset();gallery=images.filter(i=>i.product_id===p.id).sort((a,b)=>(a.display_order||0)-(b.display_order||0)).map(i=>({...i,primary:!!i.is_primary}));if(gallery.length&&!gallery.some(g=>g.primary))gallery[0].primary=true;renderGallery();for(const key of ['id','name','brand_id','category_id','description','sku','ean','cost_price','weight_grams','is_active','is_featured'])if(f.elements[key])f.elements[key].value=p[key]??'';const hasDiscount=p.compare_at_price!=null&&Number(p.compare_at_price)>Number(p.price);
 f.elements.price.value=hasDiscount?p.compare_at_price:p.price;
 discountToggle.checked=hasDiscount;syncDiscount();if(hasDiscount)discountInput.value=p.price;
 f.elements.variant_name.value=p.variant?.name||'Padrão';f.elements.initial_stock.disabled=true;host.querySelector('#npTitle').textContent='Editar produto';host.querySelector('#npPageTitle').textContent='Editar produto';showProductScreen('editor');};
  const adjust=document.createElement('button');adjust.type='button';adjust.textContent='Alterar estoque';adjust.disabled=!p.variant;adjust.onclick=async()=>{
   try{const latest=await query(db.from('inventory').select('quantity_on_hand,quantity_reserved').eq('variant_id',p.variant.id).maybeSingle());const current=Number(latest?.quantity_on_hand??0),reserved=Number(latest?.quantity_reserved??0);const result=await requestStockQuantity(p.name+' ('+p.variant.name+')',current,reserved);if(!result)return;const delta=result.quantity-current;if(delta===0){message.textContent='O estoque já está em '+current+' unidade(s).';return;}await query(db.rpc('naville_adjust_inventory',{p_variant_id:p.variant.id,p_delta:delta,p_notes:'Alteração manual da quantidade total: '+current+' para '+result.quantity}));await refresh();message.textContent='Estoque atualizado para '+result.quantity+' unidade(s).';}catch(e){message.textContent='Estoque não alterado: '+e.message;}
  };
  const remove=document.createElement('button');remove.type='button';remove.textContent='Excluir';remove.setAttribute('aria-label','Excluir produto '+p.name);remove.onclick=async()=>{const confirmed=await confirmProductRemoval(p.name);if(!confirmed)return;remove.disabled=true;try{await query(db.rpc('naville_archive_product',{p_product_id:p.id}));if(f.elements.id.value===p.id)reset();await refresh();message.textContent='Produto excluído da listagem e retirado da loja.';}catch(e){message.textContent='Não foi possível excluir o produto: '+e.message;remove.disabled=false;}};
  actions.append(edit,adjust,remove);td.append(actions);tr.append(td);body.append(tr);
 }
 table.append(body);table.querySelector('.np-select-all').onchange=e=>{checks.forEach(c=>c.checked=e.target.checked);};
 const wrap=document.createElement('div');wrap.className='np-table-wrap';wrap.append(table);root.replaceChildren(wrap);applyProductFilters();
 }

 f.onsubmit=async e=>{e.preventDefault();const button=host.querySelector('#npSave');button.disabled=true;message.textContent='Salvando...';let uploaded=null;try{
 const id=val('id'),sku=val('sku'),name=val('name'),basePrice=Number(val('price'));
 const discounted=discountToggle.checked,discountPrice=discounted?Number(val('discount_price')):null;
 if(!name||!Number.isFinite(basePrice)||basePrice<=0||!val('category_id'))throw Error('Preencha nome, categoria e preço.');
 if(discounted&&(!Number.isFinite(discountPrice)||discountPrice<=0||discountPrice>=basePrice))throw Error('O valor com desconto deve ser maior que zero e menor que o preço original.');
 const price=discounted?discountPrice:basePrice,compareAt=discounted?basePrice:null;
 
 const payload={name,...(!id?{slug:(slug(name)||'produto')+'-'+crypto.randomUUID().slice(0,8)}:{}),description:val('description')||null,brand_id:val('brand_id')||null,category_id:val('category_id'),sku:sku||null,ean:val('ean')||null,price,compare_at_price:compareAt,cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams'),is_active:val('is_active')==='true',is_featured:val('is_featured')==='true'};
 const saved=id?await query(db.from('products').update(payload).eq('id',id).select('id').single()):await query(db.from('products').insert(payload).select('id').single());
 const variantPayload={product_id:saved.id,name:val('variant_name'),sku:sku||null,ean:val('ean')||null,price,compare_at_price:compareAt,cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams')};
 const existing=cache.find(p=>p.id===saved.id)?.variant;
 const variant=existing?await query(db.from('product_variants').update(variantPayload).eq('id',existing.id).select('id').single()):await query(db.from('product_variants').insert(variantPayload).select('id').single());
 if(!id){const initial=Number(val('initial_stock')||0);if(!Number.isInteger(initial)||initial<0)throw Error('Estoque inicial inválido.');if(initial>0)await query(db.rpc('naville_adjust_inventory',{p_variant_id:variant.id,p_delta:initial,p_notes:'Estoque inicial no cadastro'}));}
 // Grava novas fotos sem substituir ou apagar as já cadastradas.
 const newRecords=[];
 for(const g of gallery){
  if(!g.file)continue;
  const ext=g.file.type==='image/jpeg'?'jpg':g.file.type==='image/png'?'png':'webp';
  const path=`${saved.id}/${crypto.randomUUID()}.${ext}`;
  await query(db.storage.from('product-images').upload(path,g.file,{contentType:g.file.type}));
  const record=await query(db.from('product_images').insert({product_id:saved.id,storage_path:path,is_primary:false,display_order:gallery.indexOf(g)}).select('id').single());
  g.id=record.id;g.storage_path=path;newRecords.push(record.id);
 }
 // Remove apenas os vínculos marcados pelo usuário, após os uploads concluírem.
 if(removedImageIds.length)await query(db.from('product_images').delete().in('id',removedImageIds).eq('product_id',saved.id));
 // Atualiza ordem e foto principal; nenhuma foto antiga é substituída.
 const main=gallery.find(g=>g.primary)||gallery[0];
 if(main){
  await query(db.from('product_images').update({is_primary:false}).eq('product_id',saved.id));
  for(let i=0;i<gallery.length;i++){
   const g=gallery[i];
   await query(db.from('product_images').update({display_order:i,is_primary:g===main}).eq('id',g.id).eq('product_id',saved.id));
  }
 }

 reset();await refresh();showProductScreen('list');host.querySelector('#npResultCount').textContent+=' · Produto salvo com sucesso.';
 }catch(ex){message.textContent='Não foi possível concluir: '+ex.message+'. Se o produto apareceu na lista, revise os dados antes de tentar novamente.';console.error(ex);}finally{button.disabled=false;}};
 try{await refresh();}catch(e){message.textContent='Erro ao carregar produtos: '+e.message;}
};
