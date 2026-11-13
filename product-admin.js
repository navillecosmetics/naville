/* Naville — cadastro manual no Supabase. Executado somente após login administrativo. */
window.setupNavilleProducts = async function(db) {
 const host=document.querySelector('#productsView');
 if(!host || host.dataset.cloudReady)return;
 host.dataset.cloudReady='1';
 host.innerHTML=`<h1>Produtos e estoque</h1><p class="admin-sub">Cadastro manual conectado ao Supabase. Produtos novos começam inativos.</p>
 <div class="admin-panel"><h2 id="npTitle">Novo produto</h2><form id="npForm" class="admin-form">
 <input name="id" type="hidden"><label>Nome do produto<input name="name" required maxlength="100"></label>
 <label>Marca (opcional)<select name="brand_id"></select></label><label>Categoria<select name="category_id" required></select></label>
 <label>Descrição<textarea name="description" rows="3"></textarea></label>
 <label>SKU (único)<input name="sku" required maxlength="80"></label><label>EAN / código de barras<input name="ean" maxlength="30"></label>
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
 <div class="admin-panel"><h2>Produtos cadastrados</h2><p class="admin-sub">O estoque é alterado somente pelo ajuste auditado abaixo.</p><div id="npRows"></div></div>`;
 const f=host.querySelector('#npForm'),message=host.querySelector('#npMessage');let cache=[];
 const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const query=async(p)=>{const {data,error}=await p;if(error)throw Error(error.message);return data;};
 const val=(name)=>f.elements[name].value.trim();
 const optionalNum=name=>val(name)===''?null:Number(val(name));
 const reset=()=>{f.reset();f.elements.id.value='';host.querySelector('#npTitle').textContent='Novo produto';f.elements.initial_stock.disabled=false;message.textContent='';};
 host.querySelector('#npCancel').onclick=reset;
 async function choices(){const [brands,cats]=await Promise.all([query(db.from('brands').select('id,name').order('name')),query(db.from('categories').select('id,name').order('name'))]);for(const [name,items] of [['brand_id',brands],['category_id',cats]]){const sel=f.elements[name],prior=sel.value;sel.replaceChildren(new Option('Selecione...', ''));for(const x of items)sel.add(new Option(x.name,x.id));sel.value=prior;}}
 async function refresh(){await choices();const [ps,vs,stocks,images,brands,cats]=await Promise.all([query(db.from('products').select('id,name,brand_id,category_id,description,sku,ean,price,compare_at_price,cost_price,weight_grams,is_active,is_featured,created_at').order('created_at',{ascending:false})),query(db.from('product_variants').select('id,product_id,name,sku,price,ean')),query(db.from('inventory').select('variant_id,quantity_on_hand,quantity_reserved')),query(db.from('product_images').select('product_id,storage_path,is_primary')),query(db.from('brands').select('id,name')),query(db.from('categories').select('id,name'))]);
 cache=ps.map(p=>({...p,variant:vs.find(v=>v.product_id===p.id),image:images.find(i=>i.product_id===p.id&&i.is_primary),brand:brands.find(b=>b.id===p.brand_id)?.name||'—',category:cats.find(c=>c.id===p.category_id)?.name||'—'}));const stockMap=new Map(stocks.map(s=>[s.variant_id,s]));
 const table=document.createElement('table');table.className='admin-table';table.innerHTML='<thead><tr><th>Produto</th><th>Marca / categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead>';const body=document.createElement('tbody');
 for(const p of cache){const tr=document.createElement('tr'),stock=stockMap.get(p.variant?.id);const cells=[p.name,p.brand+' / '+p.category,money(p.price),stock?`${stock.quantity_on_hand} (reservado ${stock.quantity_reserved})`:'—',p.is_active?'Ativo':'Rascunho'];for(const t of cells){const td=document.createElement('td');td.textContent=t;tr.append(td);}const td=document.createElement('td');const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>{reset();for(const key of ['id','name','brand_id','category_id','description','sku','ean','price','compare_at_price','cost_price','weight_grams','is_active','is_featured'])if(f.elements[key])f.elements[key].value=p[key]??'';f.elements.variant_name.value=p.variant?.name||'Padrão';f.elements.initial_stock.disabled=true;host.querySelector('#npTitle').textContent='Editar produto';f.scrollIntoView({behavior:'smooth'});};const adjust=document.createElement('button');adjust.textContent='Ajustar estoque';adjust.disabled=!p.variant;adjust.onclick=async()=>{const n=prompt('Variação '+p.variant.name+' — informe a alteração (+10 ou -2):');if(n===null)return;const delta=Number(n);if(!Number.isInteger(delta)||delta===0)return alert('Informe um número inteiro diferente de zero.');const note=prompt('Motivo do ajuste (obrigatório):');if(!note?.trim())return;try{await query(db.rpc('naville_adjust_inventory',{p_variant_id:p.variant.id,p_delta:delta,p_notes:note.trim()}));await refresh();}catch(e){alert('Estoque não alterado: '+e.message);}};td.append(edit,' ',adjust);tr.append(td);body.append(tr);}table.append(body);host.querySelector('#npRows').replaceChildren(table);
 }
 f.onsubmit=async e=>{e.preventDefault();const button=host.querySelector('#npSave');button.disabled=true;message.textContent='Salvando...';let uploaded=null;try{
 const id=val('id'),sku=val('sku'),name=val('name'),price=Number(val('price'));if(!name||!sku||price<=0||!val('category_id'))throw Error('Preencha nome, SKU, categoria e preço.');
 const file=f.elements.image.files[0];if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Imagem inválida ou maior que 5 MB.');}
 const payload={name,slug:slug(name)+'-'+slug(sku),description:val('description')||null,brand_id:val('brand_id')||null,category_id:val('category_id'),sku,ean:val('ean')||null,price,compare_at_price:optionalNum('compare_at_price'),cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams'),is_active:val('is_active')==='true',is_featured:val('is_featured')==='true'};
 const saved=id?await query(db.from('products').update(payload).eq('id',id).select('id').single()):await query(db.from('products').insert(payload).select('id').single());
 const variantPayload={product_id:saved.id,name:val('variant_name'),sku,ean:val('ean')||null,price,compare_at_price:optionalNum('compare_at_price'),cost_price:optionalNum('cost_price'),weight_grams:optionalNum('weight_grams')};
 const existing=cache.find(p=>p.id===saved.id)?.variant;
 const variant=existing?await query(db.from('product_variants').update(variantPayload).eq('id',existing.id).select('id').single()):await query(db.from('product_variants').insert(variantPayload).select('id').single());
 if(!id){const initial=Number(val('initial_stock')||0);if(!Number.isInteger(initial)||initial<0)throw Error('Estoque inicial inválido.');if(initial>0)await query(db.rpc('naville_adjust_inventory',{p_variant_id:variant.id,p_delta:initial,p_notes:'Estoque inicial no cadastro'}));}
 if(file){const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';uploaded=`${saved.id}/${crypto.randomUUID()}.${ext}`;await query(db.storage.from('product-images').upload(uploaded,file,{contentType:file.type}));const old=cache.find(p=>p.id===saved.id)?.image; if(old)await query(db.from('product_images').update({storage_path:uploaded}).eq('id',old.id));else await query(db.from('product_images').insert({product_id:saved.id,storage_path:uploaded,is_primary:true}));}
 reset();await refresh();message.textContent='Produto salvo no Supabase. Confira a listagem.';
 }catch(ex){message.textContent='Não foi possível concluir: '+ex.message+'. Se o produto apareceu na lista, revise os dados antes de tentar novamente.';console.error(ex);}finally{button.disabled=false;}};
 try{await refresh();}catch(e){message.textContent='Erro ao carregar produtos: '+e.message;}
};
