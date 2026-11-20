(()=>{'use strict';
const cfg=window.NAVILLE_SUPABASE||{};
const status=document.querySelector('#checkoutStatus'),items=document.querySelector('#checkoutItems'),subtotal=document.querySelector('#checkoutSubtotal'),addresses=document.querySelector('#checkoutAddresses');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const msg=(s,bad=false)=>{status.textContent=s;status.classList.toggle('error',bad);};
function cart(){try{const a=JSON.parse(localStorage.getItem('naville-cart-v1')||'[]');if(!Array.isArray(a))return [];const merged=new Map();for(const x of a){if(typeof x?.id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x.id)&&Number.isSafeInteger(x.qty)&&x.qty>0)merged.set(x.id,Math.min(9999,(merged.get(x.id)||0)+x.qty));}return [...merged].map(([id,qty])=>({id,qty}));}catch{return [];}}
function photo(p){return p.image_path?cfg.url.replace(/\/$/,'')+'/storage/v1/object/public/product-images/'+p.image_path.split('/').map(encodeURIComponent).join('/'):'';}
async function start(){if(!window.supabase||!cfg.url||!cfg.publishableKey){msg('Supabase não configurado.',true);return;}
const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
try{const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user){location.replace('account.html?next=checkout');return;}
document.querySelector('#checkoutCustomer').textContent=user.email||'Cliente autenticado';
const [ad,cat]=await Promise.all([db.from('customer_addresses').select('id,label,postal_code,street,number,complement,district,city,state,is_default').eq('user_id',user.id).order('created_at',{ascending:false}),db.rpc('naville_public_catalog')]);
if(ad.error)throw ad.error;if(cat.error)throw cat.error;
const list=ad.data||[];addresses.innerHTML=list.length?list.map((a,i)=>`<label class="checkout-address"><input type="radio" name="delivery_address" value="${esc(a.id)}" ${i===(list.findIndex(x=>x.is_default)<0?0:list.findIndex(x=>x.is_default))?'checked':''}><span><strong>${esc(a.label)}${a.is_default?' · Principal':''}</strong><small>${esc(a.street)}, ${esc(a.number)}${a.complement?' · '+esc(a.complement):''}<br>${esc(a.district)} · ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.postal_code)}</small></span></label>`).join(''):'<p>Nenhum endereço cadastrado. Adicione um endereço em Minha conta.</p>';
const chosen=cart(),catalog=new Map((cat.data||[]).map(p=>[p.id,{...p,product_id:p.id,variant_id:null}]));
 const variantResults=await Promise.all((cat.data||[]).map(p=>db.rpc('naville_public_variations',{p_product_id:p.id})));
 for(let i=0;i<variantResults.length;i++){if(variantResults[i].error)throw variantResults[i].error;const h=await db.rpc('naville_product_has_variations',{p_product_id:cat.data[i].id});if(h.error)throw h.error;if(h.data)catalog.set(cat.data[i].id,{...cat.data[i],available_stock:0});for(const v of variantResults[i].data||[]){const base=cat.data[i];catalog.set(v.variant_id,{...base,id:v.variant_id,product_id:base.id,variant_id:v.variant_id,price:v.price??base.price,name:base.name+' — '+v.option_name,available_stock:v.available_stock});}}let total=0,invalid=false;
items.innerHTML=chosen.length?chosen.map(x=>{const p=catalog.get(x.id),stock=Number(p?.available_stock||0),price=Number(p?.price||0),ok=!!p&&stock>=x.qty&&stock>0&&Number.isFinite(price)&&price>=0;if(ok)total+=price*x.qty;else invalid=true;const src=p?photo(p):'';return `<div class="checkout-line">${src?`<img src="${esc(src)}" alt="">`:''}<div class="checkout-line-details"><strong>${esc(p?.name||'Produto indisponível')}</strong><small>Quantidade: ${x.qty} · ${p?money(price):'Indisponível'}</small>${!ok?`<small class="checkout-alert">${!p?'Produto não está mais disponível':`Estoque disponível: ${stock}. Ajuste a sacola.`}</small>`:''}</div></div>`;}).join(''):'<p>Sua sacola está vazia. <a href="index.html#produtos">Escolher produtos</a></p>';
subtotal.textContent=invalid?'—':money(total);
msg(!chosen.length?'Sua sacola está vazia.':invalid?'Há produtos indisponíveis ou quantidades acima do estoque. Ajuste a sacola antes de continuar.':!list.length?'Cadastre um endereço para continuar.':'Selecione o endereço e calcule o frete.',invalid);

const button=document.querySelector('#quoteButton'),quoteStatus=document.querySelector('#quoteStatus'),options=document.querySelector('#quoteOptions'),freight=document.querySelector('#checkoutFreight'),grand=document.querySelector('#checkoutGrand');
const ready=chosen.length>0&&!invalid&&list.length>0;
let generation=0,cartChanged=false;
function reset(){generation++;options.replaceChildren();freight.textContent='—';grand.textContent='—';quoteStatus.textContent='';button.disabled=!ready||cartChanged;}
addresses.addEventListener('change',reset);
window.addEventListener('storage',e=>{if(e.key==='naville-cart-v1'||e.key===null){cartChanged=true;reset();quoteStatus.textContent='Sua sacola mudou. Atualize esta página.';}});
reset();
button.addEventListener('click',async()=>{
 reset(); const request=++generation; button.disabled=true;
 const address=list.find(a=>a.id===addresses.querySelector('input:checked')?.value);
 const cep=String(address?.postal_code||'').replace(/\D/g,'');
 try{
 if(!/^\d{8}$/.test(cep))throw Error('CEP inválido. Edite o endereço na sua conta.');
 quoteStatus.textContent='Consultando opções de entrega...';
 const {data,error}=await db.functions.invoke('melhor-envio-quote',{body:{destination_cep:cep,items:chosen.map(x=>{const p=catalog.get(x.id);return {product_id:p.product_id,variant_id:p.variant_id,quantity:x.qty};})}});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error||'Não foi possível calcular o frete. Tente novamente.');}
 if(request!==generation)return;
 if(data?.status!=='ok'||!Array.isArray(data.quotes))throw Error('Resposta de frete inválida.');
 const quotes=data.quotes.filter(q=>q.price!=null&&Number.isFinite(Number(q.price))&&Number(q.price)>=0&&q.delivery_time!=null&&Number.isFinite(Number(q.delivery_time))&&Number(q.delivery_time)>=0);
 if(!quotes.length){quoteStatus.textContent='Nenhuma entrega disponível para este endereço.';return;}
 quoteStatus.textContent='Selecione uma opção de entrega:';
 for(const q of quotes){const label=document.createElement('label');label.className='checkout-address checkout-quote';const radio=document.createElement('input');radio.type='radio';radio.name='shipping_service';radio.value=String(q.id);const desc=document.createElement('span');const name=document.createElement('strong');name.textContent=[q.company,q.service].filter(Boolean).join(' ');const days=document.createElement('small');days.textContent=`Prazo estimado: ${q.delivery_time} dias, incluindo preparação`;desc.append(name,days);const cost=document.createElement('strong');cost.textContent=money(q.price);label.append(radio,desc,cost);options.append(label);radio.addEventListener('change',()=>{if(request!==generation)return;freight.textContent=money(q.price);grand.textContent=money(total+Number(q.price));});}
 }catch(e){if(request===generation)quoteStatus.textContent=e.message||'Não foi possível calcular o frete.';}
 finally{if(request===generation)button.disabled=!ready||cartChanged;}
});
}catch(e){console.error('Naville checkout:',e);msg('Não foi possível carregar os dados do checkout. '+(e.message||''),true);items.textContent='Não foi possível conferir os produtos.';addresses.textContent='Não foi possível carregar os endereços.';}}
start();
})();