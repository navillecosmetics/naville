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
const list=ad.data||[];addresses.innerHTML=list.length?list.map((a,i)=>`<label class="checkout-address"><input type="radio" name="delivery_address" value="${esc(a.id)}" ${a.is_default||(!list.some(x=>x.is_default)&&i===0)?'checked':''}><span><strong>${esc(a.label)}${a.is_default?' · Principal':''}</strong><small>${esc(a.street)}, ${esc(a.number)}${a.complement?' · '+esc(a.complement):''}<br>${esc(a.district)} · ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.postal_code)}</small></span></label>`).join(''):'<p>Nenhum endereço cadastrado. Adicione um endereço em Minha conta.</p>';
const chosen=cart(),catalog=new Map((cat.data||[]).map(p=>[p.id,p]));let total=0,invalid=false;
items.innerHTML=chosen.length?chosen.map(x=>{const p=catalog.get(x.id),stock=Number(p?.available_stock||0),price=Number(p?.price||0),ok=!!p&&stock>=x.qty&&stock>0&&Number.isFinite(price)&&price>=0;if(ok)total+=price*x.qty;else invalid=true;const src=p?photo(p):'';return `<div class="checkout-line">${src?`<img src="${esc(src)}" alt="">`:''}<div class="checkout-line-details"><strong>${esc(p?.name||'Produto indisponível')}</strong><small>Quantidade: ${x.qty} · ${p?money(price):'Indisponível'}</small>${!ok?`<small class="checkout-alert">${!p?'Produto não está mais disponível':`Estoque disponível: ${stock}. Ajuste a sacola.`}</small>`:''}</div></div>`;}).join(''):'<p>Sua sacola está vazia. <a href="index.html#produtos">Escolher produtos</a></p>';
subtotal.textContent=invalid?'—':money(total);
msg(!chosen.length?'Sua sacola está vazia.':invalid?'Há produtos indisponíveis ou quantidades acima do estoque. Ajuste a sacola antes de continuar.':!list.length?'Cadastre um endereço para continuar.':'Dados conferidos no Supabase. Checkout em preparação: nenhum pedido será criado.',invalid);
}catch(e){console.error('Naville checkout:',e);msg('Não foi possível carregar os dados do checkout. '+(e.message||''),true);items.textContent='Não foi possível conferir os produtos.';addresses.textContent='Não foi possível carregar os endereços.';}}
start();
})();