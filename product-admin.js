/* Naville — cadastro manual no Supabase. Executado somente após login administrativo. */
window.setupNavilleProducts = async function(db) {
 const host=document.querySelector('#productsView');
 if(!host || host.dataset.cloudReady)return;
 host.dataset.cloudReady='1';
 host.innerHTML=`<h1>Produtos e estoque</h1><p class="admin-sub">Cadastro manual conectado ao banco de dados. Produtos novos começam inativos.</p>
 <div class="admin-panel"><h2 id="npTitle">Novo produto</h2><form id="npForm" class="admin-form">
 <input name="id" type="hidden"><label>Nome do produto<input name="name" required maxlength="100"></label>
 <label>Marca (opcional)<select name="brand_id"></select></label><label>Categoria<select name="category_id" required></select></label>
 <label>Descrição<textarea name="description" rows="3"></textarea></label>
 <label>SKU (opcional, único quando informado)<input name="sku" maxlength="80"></label><label>EAN / código de barras (opcional)<input name="ean" maxlength="30"></label>
 <label>Apresentação / variação<input name="variant_name" required placeholder="Ex.: 250 ml, tom 01, padrão"></label>
 <label>Preço de venda (R$)<input name="price" type="number" min="0.01" step="0.01" required></label>
 <label>Preço anterior (opcional)<input name="compare_at_price" type="number" min="0" step="0.01"></label>
 <label>Custo de compra (R$)<input name="cost_price" type="number" min="0" step="0.01"></label>
 <label>Peso (gramas)<input name="weight_grams" type="number" min="1" step="1"></label>
 <label>Estoque físico inicial (somente no cadastro)<input name="initial_stock" type="number" min="0" step="1" value="0"></label>
 <label>Ativo na loja<select name="is_active"><option value="false">Não — rascunho</option><option value="true">Sim</option></select></label>
 <label>Destaque<select name="is_featured"><option value="false">Não</option><option value="true">Sim</option></select></label>
 <label class="span2">Foto principal (JPG, PNG ou WebP, até 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label>
 <div class="span2 admin-actions"><button type="submit" id="npSave">Salvar produto</button><button type="button" id="npCancel">Limpar / cancelar</button></div></form><p id="npMessage" role="status" class="admin-sub"></p></div>
 <div class="admin-panel"><h2>Produtos cadastrados</h2><p class="admin-sub">Excluir retira o produto da loja e desta lista, preservando o histórico no banco. O estoque é alterado somente pelo ajuste auditado abaixo.</p><div id="npRows"></div></div>`;
 const f=host.querySelector('#npForm'),message=host.querySelector('#npMessage');let cache=[];
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
 const reset=()=>{f.reset();f.elements.id.value='';host.querySelector('#npTitle').textContent='Novo produto';f.elements.initial_stock.disabled=false;message.textContent='';};
 host.querySelector('#npCancel').onclick=reset;
 async function choices(){const [brands,cats]=await Promise.all([query(db.from('brands').select('id,name').order('name')),query(db.from('categories').select('id,name').order('name'))]);for(const [name,items] of [['brand_id',brands],['category_id',cats]]){const sel=f.elements[name],prior=sel.value;sel.replaceChildren(new Option('Selecione...', ''));for(const x of items)sel.add(new Option(x.name,x.id));sel.value=prior;}}
 async function refresh(){await choices();const [ps,vs,stocks,images,brands,cats]=await Promise.all([query(db.from('products').select('id,name,brand_id,category_id,description,sku,ean,price,compare_at_price,cost_price,weight_grams,is_active,is_featured,created_at,deleted_at').is('deleted_at',null).order('created_at',{ascending:false})),query(db.from('product_variants').select('id,product_id,name,sku,price,ean')),query(db.from('inventory').select('variant_id,quantity_on_hand,quantity_reserved')),query(db.from('product_images').select('product_id,storage_path,is_primary')),query(db.from('brands').select('id,name')),query(db.from('categories').select('id,name'))]);
 cache=ps.map(p=>({...p,variant:vs.find(v=>v.product_id===p.id),image:images.find(i=>i.product_id===p.id&&i.is_primary)||images.find(i=>i.product_id===p.id),brand:brands.find(b=>b.id===p.brand_id)?.name||'—',category:cats.find(c=>c.id===p.category_id)?.name||'—',variantCount:vs.filter(v=>v.product_id===p.id).length}));
 const stockMap=new Map(stocks.map(s=>[s.variant_id,s]));
 const root=host.querySelector('#npRows');
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
 .np-product-table .np-actions{display:flex;gap:6px;flex-wrap:wrap}.np-product-table .np-actions button{padding:7px 9px;font-size:12px;border-radius:5px;white-space:nowrap}
 .np-product-table input[type=checkbox]{accent-color:#20211f;width:15px;height:15px}
 `;document.head.append(style);}
 const table=document.createElement('table');table.className='np-product-table';
 table.innerHTML='<thead><tr><th><input type="checkbox" aria-label="Selecionar todos os produtos" class="np-select-all"></th><th>Código</th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Vendas</th><th>Status</th><th>Ações</th></tr></thead>';
 const body=document.createElement('tbody');const checks=[];
 const cell=(tr,text)=>{const td=document.createElement('td');td.textContent=text;tr.append(td);return td;};
 for(const p of cache){
  const tr=document.createElement('tr');const stock=stockMap.get(p.variant?.id);
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
  const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{reset();for(const key of ['id','name','brand_id','category_id','description','sku','ean','price','compare_at_price','cost_price','weight_grams','is_active','is_featured'])if(f.elements[key])f.elements[key].value=p[key]??'';f.elements.variant_name.value=p.variant?.name||'Padrão';f.elements.initial_stock.disabled=true;host.querySelector('#npTitle').textContent='Editar produto';f.scrollIntoView({behavior:'smooth'});};
  const adjust=document.createElement('button');adjust.type='button';adjust.textContent='Alterar estoque';adjust.disabled=!p.variant;adjust.onclick=async()=>{
   try{const latest=await query(db.from('inventory').select('quantity_on_hand,quantity_reserved').eq('variant_id',p.variant.id).maybeSingle());const current=Number(latest?.quantity_on_hand??0),reserved=Number(latest?.quantity_reserved??0);const result=await requestStockQuantity(p.name+' ('+p.variant.name+')',current,reserved);if(!result)return;const delta=result.quantity-current;if(delta===0){message.textContent='O estoque já está em '+current+' unidade(s).';return;}await query(db.rpc('naville_adjust_inventory',{p_variant_id:p.variant.id,p_delta:delta,p_notes:'Alteração manual da quantidade total: '+current+' para '+result.quantity}));await refresh();message.textContent='Estoque atualizado para '+result.quantity+' unidade(s).';}catch(e){message.textContent='Estoque não alterado: '+e.message;}
  };
  const remove=document.createElement('button');remove.type='button';remove.textContent='Excluir';remove.style.cssText='color:#9b2525;border-color:#c78a8a';remove.setAttribute('aria-label','Excluir produto '+p.name);remove.onclick=async()=>{const confirmed=await confirmProductRemoval(p.name);if(!confirmed)return;remove.disabled=true;try{await query(db.rpc('naville_archive_product',{p_product_id:p.id}));if(f.elements.id.value===p.id)reset();await refresh();message.textContent='Produto excluído da listagem e retirado da loja.';}catch(e){message.textContent='Não foi possível excluir o produto: '+e.message;remove.disabled=false;}};
  actions.append(edit,adjust,remove);td.append(actions);tr.append(td);body.append(tr);
 }
 table.append(body);table.querySelector('.np-select-all').onchange=e=>{checks.forEach(c=>c.checked=e.target.checked);};
 const wrap=document.createElement('div');wrap.className='np-table-wrap';wrap.append(table);root.replaceChildren(wrap);
 }

 f.onsubmit=async e=>{e.preventDefault();const button=host.querySelector('#npSave');button.disabled=true;message.textContent='Salvando...';let uploaded=null;try{
 const id=val('id'),sku=val('sku'),name=val('name'),price=Number(val('price'));if(!name||price<=0||!val('category_id'))throw Error('Preencha nome, categoria e preço.');
 const file=f.elements.image.files[0];if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Imagem inválida ou maior que 5 MB.');}
 const payload={name,...(!id?{slug:(slug(name)||'produto')+'-'+crypto.randomUUID().slice(0,8)}:{}),description:val('description')||null,brand_id:val('brand_id')||null,category_id:val('category_id'),sku:sku||null,ean:val('ean')||null,price,compare_at_price:optionalNum('compare_at_price'),cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams'),is_active:val('is_active')==='true',is_featured:val('is_featured')==='true'};
 const saved=id?await query(db.from('products').update(payload).eq('id',id).select('id').single()):await query(db.from('products').insert(payload).select('id').single());
 const variantPayload={product_id:saved.id,name:val('variant_name'),sku:sku||null,ean:val('ean')||null,price,compare_at_price:optionalNum('compare_at_price'),cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams')};
 const existing=cache.find(p=>p.id===saved.id)?.variant;
 const variant=existing?await query(db.from('product_variants').update(variantPayload).eq('id',existing.id).select('id').single()):await query(db.from('product_variants').insert(variantPayload).select('id').single());
 if(!id){const initial=Number(val('initial_stock')||0);if(!Number.isInteger(initial)||initial<0)throw Error('Estoque inicial inválido.');if(initial>0)await query(db.rpc('naville_adjust_inventory',{p_variant_id:variant.id,p_delta:initial,p_notes:'Estoque inicial no cadastro'}));}
 if(file){const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';uploaded=`${saved.id}/${crypto.randomUUID()}.${ext}`;await query(db.storage.from('product-images').upload(uploaded,file,{contentType:file.type}));const old=cache.find(p=>p.id===saved.id)?.image; if(old)await query(db.from('product_images').update({storage_path:uploaded}).eq('id',old.id));else await query(db.from('product_images').insert({product_id:saved.id,storage_path:uploaded,is_primary:true}));}
 reset();await refresh();message.textContent='Produto salvo no banco de dados. Confira a listagem.';
 }catch(ex){message.textContent='Não foi possível concluir: '+ex.message+'. Se o produto apareceu na lista, revise os dados antes de tentar novamente.';console.error(ex);}finally{button.disabled=false;}};
 try{await refresh();}catch(e){message.textContent='Erro ao carregar produtos: '+e.message;}
};
