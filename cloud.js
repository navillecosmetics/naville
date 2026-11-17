/* Naville cloud v1: autenticação, categorias e banners reais. Sem checkout. */
(() => {
 const cfg=window.NAVILLE_SUPABASE||{};
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url)&&/^sb_publishable_/.test(cfg.publishableKey);
 if(!configured||!window.supabase){
   if(document.body.classList.contains('admin-body')){
     document.body.innerHTML='<main style="max-width:640px;margin:12vh auto;font:16px Arial;padding:24px"><h1>Configuração necessária</h1><p>Preencha a URL e a publishable key em <code>supabase-config.js</code>. O painel permanece bloqueado até a configuração.</p></main>';
   }
   return;
 }
 const db=window.supabase.createClient(cfg.url.replace(/\/$/,''),cfg.publishableKey);
 const urlFor=(bucket,path)=>path?db.storage.from(bucket).getPublicUrl(path).data.publicUrl:'';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const err=e=>{throw new Error(e.message||String(e));};
 async function upload(bucket,file){
   if(!file)return null;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Formato inválido. Use JPG, PNG ou WebP.');
   const max=bucket==='banner-images'?10:5;
   if(file.size>max*1024*1024)throw Error(`Imagem acima de ${max} MB.`);
   const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
   const path=`${crypto.randomUUID()}.${ext}`;
   const {error}=await db.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(error)err(error);return path;
 }
 async function list(table,columns='*'){const {data,error}=await db.from(table).select(columns);if(error)err(error);return data||[];}
 async function save(table,payload){const id=payload.id;const query=id?db.from(table).update(Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='id'))).eq('id',id):db.from(table).insert(payload);const {error}=await query;if(error)err(error);}
 async function remove(table,id){const {error}=await db.from(table).delete().eq('id',id);if(error)err(error);}
 async function admin(){
   const layout=document.querySelector('.admin-layout');if(!layout)return;
   layout.hidden=true;
   const gate=document.createElement('div');gate.className='naville-auth';document.body.prepend(gate);
   const showLogin=(message='')=>{layout.hidden=true;gate.hidden=false;gate.innerHTML=`<form id="cloudLogin"><img src="assets/logo.png" alt="Naville"><h1>Acesso administrativo</h1><p>Entre com sua conta autorizada.</p><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button>Entrar</button><p id="cloudAuthMessage" role="alert">${escape(message)}</p></form>`;gate.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const {error}=await db.auth.signInWithPassword({email:f.elements.email.value,password:f.elements.password.value});if(error){gate.querySelector('#cloudAuthMessage').textContent='Não foi possível entrar. Confira os dados.';return;}await check();};};
   async function check(){const {data:{user}}=await db.auth.getUser();if(!user){showLogin();return;}
     const {data,error}=await db.from('admin_users').select('role,is_active').eq('user_id',user.id).maybeSingle();
     if(error){console.error('Naville: erro ao consultar admin_users', {code:error.code,message:error.message});showLogin('Não foi possível verificar a autorização ('+(error.code||'erro de consulta')+'). Confira as permissões da tabela admin_users.');return;}
     if(!data?.is_active){await db.auth.signOut();showLogin('Conta sem autorização administrativa.');return;}
     gate.hidden=true;layout.hidden=false;
     document.querySelector('.admin-caption').textContent='PAINEL · SUPABASE';
     document.querySelector('.admin-top').style.display='none';
     document.querySelector('.admin-main > .notice').style.display='none';
     if(!document.querySelector('#cloudLogout')){const b=document.createElement('button');b.id='cloudLogout';b.textContent='Sair da conta';document.querySelector('.sidebar').append(b);b.onclick=async()=>{await db.auth.signOut();showLogin();};}
     await setupCloudAdmin();
     if(window.setupNavilleVariations)await window.setupNavilleVariations(db);
     if(window.setupNavilleProducts) await window.setupNavilleProducts(db);
   }
   db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')showLogin();});await check();
 }
 let installed=false;
 async function setupCloudAdmin(){if(!installed){installed=true;
   // Substitui somente os módulos locais de categorias e banners por interfaces conectadas.
   const cat=document.querySelector('#categoriesView');
   cat.innerHTML=`<h1>Categorias</h1><p class="admin-sub">Dados reais do Supabase.</p><div class="admin-panel"><form id="cloudCatForm" class="admin-form"><input type="hidden" name="id"><label>Nome<input name="name" required maxlength="65"></label><label>Descrição<input name="description" maxlength="100"></label><label>Ativa<select name="is_active"><option value="true">Sim</option><option value="false">Não</option></select></label><label>Exibir no menu superior<select name="show_in_menu"><option value="true">Sim</option><option value="false">Não</option></select></label><label>Exibir nos banners de categorias<select name="show_in_category_banners"><option value="true">Sim</option><option value="false">Não</option></select></label><div class="span2 admin-actions"><button>Salvar categoria</button><button type="reset">Limpar</button></div></form><p id="cloudCatMessage" role="status"></p></div><div class="admin-panel" id="cloudCatList"></div>`;
   const ban=document.querySelector('#bannersView');
   ban.innerHTML=`<h1>Banners</h1><p class="admin-sub">Imagens e links armazenados no Supabase.</p><div class="admin-tabs"><button id="cloudTabMain" class="selected">Banners principais</button><button id="cloudTabCat">Banners de categorias</button></div><div id="cloudMain"><div class="admin-panel"><form id="cloudBannerForm" class="admin-form"><input name="id" type="hidden"><label>Título<input name="title" required></label><label>Link<input name="link_url" placeholder="https://... ou #produtos"></label><label>Ordem<input name="display_order" type="number" value="0"></label><label>Ativo<select name="is_active"><option value="true">Sim</option><option value="false">Não</option></select></label><label class="span2">Imagem<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label><div class="span2 admin-actions"><button>Salvar banner</button><button type="reset">Limpar</button></div></form><p id="cloudBannerMessage" role="status"></p></div><div class="admin-panel" id="cloudBannerList"></div></div><div id="cloudCategoryBanners" class="admin-panel" hidden></div>`;
   // Telas separadas de listagem e edição, sem alterar o fluxo de persistência.
   function installEditorNavigation(section,formId,listId,label){
     const form=document.querySelector('#'+formId);
     const list=document.querySelector('#'+listId);
     const panel=form.closest('.admin-panel');
     const title=section.querySelector('h1');
     const header=document.createElement('div');header.className='nv-page-list-header';
     const create=document.createElement('button');create.type='button';create.className='nv-create-button';create.textContent='+ Criar '+label;
     const back=document.createElement('button');back.type='button';back.className='nv-back-button';back.textContent='← Voltar para lista';
     const listWrapper=document.createElement('div');listWrapper.className='nv-list-screen';
     const editorWrapper=document.createElement('div');editorWrapper.className='nv-editor-screen';editorWrapper.hidden=true;
     const editorHeading=document.createElement('h2');editorHeading.textContent='Nova '+label;
     header.append(create);listWrapper.append(header,list);
     editorWrapper.append(back,editorHeading,panel);
     (label==='banner'?section.querySelector('#cloudMain'):section).append(listWrapper,editorWrapper);
     function showEditor(editing){listWrapper.hidden=true;listWrapper.style.display='none';editorWrapper.hidden=false;editorWrapper.style.display='block';editorHeading.textContent=(editing?'Editar ':'Nova ')+label;title.textContent=(editing?'Editar ':'Nova ')+label;section.scrollIntoView({block:'start'});}
     function showList(){editorWrapper.hidden=true;editorWrapper.style.display='none';listWrapper.hidden=false;listWrapper.style.display='block';title.textContent=label==='categoria'?'Categorias':'Banners';section.scrollIntoView({block:'start'});}
     create.onclick=()=>{form.reset();form.elements.id.value='';showEditor(false);};
     showList();
     back.onclick=showList;
     form.addEventListener('reset',()=>{if(form.dataset.nvSaved==='1'){form.dataset.nvSaved='';setTimeout(showList,0);}});
     return {showEditor,showList};
   }
   const catNav=installEditorNavigation(cat,'cloudCatForm','cloudCatList','categoria');
   const bannerNav=installEditorNavigation(ban,'cloudBannerForm','cloudBannerList','banner');
   // Navegação disponibilizada para os botões Editar e para o salvamento.
   window.nvCategoryNav=catNav;window.nvBannerNav=bannerNav;
   const navCss=document.createElement('style');navCss.textContent=`.nv-page-list-header{display:flex;justify-content:flex-end;align-items:center;margin:0 0 20px}.nv-create-button{background:#9caf9d!important;color:#fff!important;border:1px solid #9caf9d!important;border-radius:7px;padding:12px 20px;cursor:pointer}.nv-back-button{border:0;background:transparent;padding:8px 0 20px;cursor:pointer;font-size:14px}.nv-editor-screen>.admin-panel{margin-top:14px}.nv-editor-screen[hidden],.nv-list-screen[hidden]{display:none!important}`;document.head.append(navCss);
   const tab=(cat)=>{document.querySelector('#cloudMain').hidden=cat;document.querySelector('#cloudCategoryBanners').hidden=!cat;document.querySelector('#cloudTabMain').classList.toggle('selected',!cat);document.querySelector('#cloudTabCat').classList.toggle('selected',cat);};
   document.querySelector('#cloudTabMain').onclick=()=>tab(false);document.querySelector('#cloudTabCat').onclick=()=>tab(true);
   document.querySelector('#cloudCatForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,m=document.querySelector('#cloudCatMessage');try{const name=f.elements.name.value.trim();const payload={name,slug:slug(name),description:f.elements.description.value.trim(),display_order:f.elements.id.value?undefined:((await list('categories','display_order')).reduce((max,c)=>Math.max(max,Number(c.display_order)||0),-1)+1),is_active:f.elements.is_active.value==='true',show_in_menu:f.elements.show_in_menu.value==='true',show_in_category_banners:f.elements.show_in_category_banners.value==='true'};if(f.elements.id.value){payload.id=f.elements.id.value;delete payload.display_order;}await save('categories',payload);f.reset();f.elements.id.value='';m.textContent='Categoria salva.';await refresh();catNav.showList();}catch(x){m.textContent=x.message;}};
   document.querySelector('#cloudBannerForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,m=document.querySelector('#cloudBannerMessage');try{const id=f.elements.id.value;const existing=(await list('banners')).find(b=>b.id===id);const file=f.elements.image.files[0];const image_path=file?await upload('banner-images',file):existing?.image_path;if(!image_path)throw Error('Selecione uma imagem.');const link=f.elements.link_url.value.trim();if(link&&!/^https?:\/\//i.test(link)&&!/^#[\w-]+$/.test(link))throw Error('Use um link https:// ou uma âncora #secao.');const payload={title:f.elements.title.value.trim(),link_url:link||null,display_order:id?Number(f.elements.display_order.value):Number(f.elements.display_order.value||0),is_active:f.elements.is_active.value==='true',image_path};if(id)payload.id=id;await save('banners',payload);f.reset();f.elements.id.value='';m.textContent='Banner salvo.';await refresh();bannerNav.showList();}catch(x){m.textContent=x.message;}};
 }
 await refresh();}
 async function refresh(){try{
   const cats=(await list('categories')).sort((a,b)=>a.display_order-b.display_order);
   const banners=(await list('banners')).sort((a,b)=>a.display_order-b.display_order);
   const catHost=document.querySelector('#cloudCatList');catHost.replaceChildren();
   const dragStyleId='naville-category-drag-style';
   if(!document.getElementById(dragStyleId)){
     const style=document.createElement('style');style.id=dragStyleId;style.textContent=`
      #cloudCatList .category-admin-row{display:flex;align-items:center;gap:12px;transition:background .15s}
      #cloudCatList .category-admin-row .np-drag-handle{flex:none;border:0;background:transparent;color:#87908b;font-size:23px;line-height:1;padding:9px;cursor:grab;touch-action:none;user-select:none}
      #cloudCatList .category-admin-row .np-drag-handle:active{cursor:grabbing}
      #cloudCatList .category-admin-row .np-category-info{flex:1;min-width:0}
      #cloudCatList .category-admin-row.np-dragging{opacity:.45}
      #cloudCatList .category-admin-row.np-drop-before{box-shadow:inset 0 3px #91aa91}
      #cloudCatList .category-admin-row.np-drop-after{box-shadow:inset 0 -3px #91aa91}
      #cloudCatList.np-saving{pointer-events:none;opacity:.7}
     `;document.head.append(style);
   }
   let draggedId=null,dragSource=null,dropTarget=null,dropAfter=false;
   async function persistCategoryOrder(){
     const rows=[...catHost.querySelectorAll('[data-category-id]')];
     const original=new Map(cats.map(c=>[c.id,c.display_order]));
     catHost.classList.add('np-saving');
     const msg=document.querySelector('#cloudCatMessage');msg.textContent='Salvando nova ordem...';
     try{
       // Atualiza todas as posições em sequência; preserva os demais campos.
       for(let i=0;i<rows.length;i++){
         const id=rows[i].dataset.categoryId;
         const {error}=await db.from('categories').update({display_order:i}).eq('id',id);
         if(error)err(error);
       }
       msg.textContent='Ordem das categorias salva.';
       await refresh();
     }catch(x){
       msg.textContent='Não foi possível salvar a ordem: '+x.message;
       // Recarrega a ordem persistida, sem presumir que todas as atualizações ocorreram.
       try{await refresh();}catch(e){console.error(e);}
     }finally{catHost.classList.remove('np-saving');}
   }
   for(const c of cats){
     const row=document.createElement('div');row.className='category-admin-row';row.dataset.categoryId=c.id;
     row.innerHTML=`<button type="button" class="np-drag-handle" draggable="true" aria-label="Arrastar categoria ${escape(c.name)}" title="Arraste para reorganizar">⠿</button><div class="np-category-info"><strong>${escape(c.name)}</strong><small>${c.is_active?'Ativa':'Inativa'} · Menu: ${c.show_in_menu?'Sim':'Não'} · Banner: ${c.show_in_category_banners?'Sim':'Não'} · ${escape(c.slug)}</small></div><div class="admin-actions"><button class="edit">Editar</button><button class="delete">Excluir</button></div>`;
     const handle=row.querySelector('.np-drag-handle');
     handle.addEventListener('dragstart',e=>{draggedId=c.id;dragSource=row;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.id);row.classList.add('np-dragging');});
     handle.addEventListener('dragend',()=>{draggedId=null;dragSource=null;catHost.querySelectorAll('.np-drop-before,.np-drop-after,.np-dragging').forEach(el=>el.classList.remove('np-drop-before','np-drop-after','np-dragging'));});
     row.addEventListener('dragover',e=>{if(!draggedId||draggedId===c.id)return;e.preventDefault();dropAfter=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;catHost.querySelectorAll('.np-drop-before,.np-drop-after').forEach(el=>el.classList.remove('np-drop-before','np-drop-after'));row.classList.add(dropAfter?'np-drop-after':'np-drop-before');});
     row.addEventListener('drop',async e=>{if(!draggedId||draggedId===c.id)return;e.preventDefault();const source=catHost.querySelector('[data-category-id="'+draggedId+'"]');if(!source)return;const after=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;row.classList.remove('np-drop-before','np-drop-after');catHost.insertBefore(source,after?row.nextSibling:row);draggedId=null;await persistCategoryOrder();});
     row.querySelector('.edit').onclick=()=>{const f=document.querySelector('#cloudCatForm');for(const k of ['id','name','description'])f.elements[k].value=c[k]??'';for(const k of ['is_active','show_in_menu','show_in_category_banners'])f.elements[k].value=String(c[k]??true);catNav.showEditor(true);};
     row.querySelector('.delete').onclick=async()=>{if(!confirm(`Excluir ${c.name}? Categorias vinculadas a produtos não podem ser excluídas.`))return;try{await remove('categories',c.id);await refresh();}catch(x){alert(x.message);}};
     catHost.append(row);
   }
   const bHost=document.querySelector('#cloudBannerList');bHost.replaceChildren();
   for(const b of banners){const row=document.createElement('div');row.className='banner-admin-item';const img=document.createElement('img');img.src=urlFor('banner-images',b.image_path);img.alt='';img.style.cssText='width:150px;height:75px;object-fit:cover';const title=document.createElement('div');title.textContent=b.title+' · '+(b.is_active?'Ativo':'Inativo');const actions=document.createElement('div');actions.className='admin-actions';const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>{const f=document.querySelector('#cloudBannerForm');for(const k of ['id','title','link_url','display_order'])f.elements[k].value=b[k]??'';f.elements.is_active.value=String(b.is_active);bannerNav.showEditor(true);};const del=document.createElement('button');del.textContent='Excluir';del.onclick=async()=>{if(confirm('Excluir este banner?')){try{await remove('banners',b.id);await refresh();}catch(x){alert(x.message);}}};actions.append(edit,del);row.append(img,title,actions);bHost.append(row);}
   const cHost=document.querySelector('#cloudCategoryBanners');cHost.replaceChildren();const hint=document.createElement('p');hint.className='admin-sub';hint.textContent='Somente categorias ativas com “Exibir nos banners de categorias” = Sim aparecem na loja (máximo de 6, por ordem). Ajuste a visibilidade na aba Categorias.';cHost.append(hint);
   for(const c of cats){const row=document.createElement('div');row.className='category-admin-row';const title=document.createElement('strong');title.textContent=c.name+' · '+(c.show_in_category_banners?'Exibindo':'Oculto');const img=document.createElement('img');img.style.cssText='width:90px;height:65px;object-fit:cover';if(c.image_path)img.src=urlFor('category-images',c.image_path);const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.onchange=async()=>{try{const path=await upload('category-images',input.files[0]);await save('categories',{id:c.id,image_path:path});await refresh();}catch(x){alert(x.message);}};const del=document.createElement('button');del.textContent='Remover foto';del.disabled=!c.image_path;del.onclick=async()=>{try{await save('categories',{id:c.id,image_path:null});await refresh();}catch(x){alert(x.message);}};row.append(img,title,input,del);cHost.append(row);}
 }catch(x){alert('Falha ao carregar dados do Supabase: '+x.message);}}
 async function storefront(){
   try{
     const {data:cats,error:ce}=await db.from('categories').select('id,name,description,image_path,is_active,display_order,show_in_menu,show_in_category_banners').eq('is_active',true).order('display_order');if(ce)err(ce);
     const {data:bs,error:be}=await db.from('banners').select('id,title,image_path,link_url,alt_text,is_active,display_order').eq('is_active',true).order('display_order');if(be)err(be);
     // Categorias e banners são a fonte de verdade; dados demo não são gravados no Supabase.
     const menu=document.querySelector('#navilleCategoryMenu');if(menu){menu.replaceChildren();for(const c of cats.filter(x=>x.show_in_menu)){const link=document.createElement('a');link.href='#produtos';link.textContent=c.name;link.onclick=()=>window.dispatchEvent(new CustomEvent('naville-category-selected',{detail:{name:c.name}}));menu.append(link);}const all=document.createElement('a');all.href='#produtos';all.textContent='Todos os produtos';all.onclick=()=>window.dispatchEvent(new CustomEvent('naville-category-selected',{detail:{name:'Todos'}}));menu.append(all);}
     const target=document.querySelector('#categoryGrid');if(target){target.replaceChildren();for(const c of cats.filter(x=>x.show_in_category_banners).slice(0,6)){const button=document.createElement('button');button.className='category';const art=document.createElement('span');art.className='category-art';if(c.image_path){const img=document.createElement('img');img.src=urlFor('category-images',c.image_path);img.alt='';art.append(img);}else art.textContent='✦';const title=document.createElement('strong');title.textContent=c.name;const desc=document.createElement('small');desc.textContent=c.description||'';button.append(art);button.setAttribute('aria-label',c.name);button.onclick=()=>{window.dispatchEvent(new CustomEvent('naville-category-selected',{detail:{name:c.name}}));};target.append(button);}}
     const host=document.querySelector('#bannerSlides');if(host&&!bs.length){host.innerHTML='<div class="naville-empty-banner">Naville Cosmetics</div>';document.querySelector('#bannerPrev').hidden=true;document.querySelector('#bannerNext').hidden=true;document.querySelector('#bannerDots').replaceChildren();}if(host&&bs.length){const carousel=host.closest('.banner-carousel');const dots=document.querySelector('#bannerDots');host.replaceChildren();let index=0;for(const b of bs){const slide=document.createElement('a');slide.className='banner-slide banner-image-slide';slide.href=b.link_url||'#produtos';const img=document.createElement('img');img.src=urlFor('banner-images',b.image_path);img.alt=b.alt_text||b.title;slide.append(img);host.append(slide);}const slides=[...host.children];const draw=()=>{slides.forEach((s,i)=>{s.style.cssText=`display:block;position:absolute;inset:0;width:100%;height:100%;transition:transform .6s ease;transform:translateX(${(i-index)*100}%);visibility:visible`;});dots.replaceChildren();slides.forEach((_,i)=>{const d=document.createElement('button');d.className=i===index?'is-active':'';d.setAttribute('aria-label','Banner '+(i+1));d.onclick=()=>{index=i;draw();};dots.append(d);});};host.style.cssText='position:relative;overflow:hidden;aspect-ratio:2.82/1;min-height:200px';draw();document.querySelector('#bannerPrev').onclick=()=>{index=(index-1+slides.length)%slides.length;draw();};document.querySelector('#bannerNext').onclick=()=>{index=(index+1)%slides.length;draw();};setInterval(()=>{if(!document.hidden){index=(index+1)%slides.length;draw();}},5500);}
   }catch(x){console.error('Naville: erro ao carregar vitrine',x);}
 }
 if(document.body.classList.contains('admin-body'))admin();else storefront();
})();
