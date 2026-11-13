// Dados demonstrativos. Não usar localStorage como fonte de verdade em produção.
const NAVILLE_KEY='naville-demo-products-v1';
const NAVILLE_SEED=[
{id:'nv-001',name:'Máscara Nutritiva',brand:'Marca Exemplo',category:'Cabelos',price:89.9,stock:24,emoji:'◌',tone:'#e9dfcd'},
{id:'nv-002',name:'Sérum Facial Hidratante',brand:'Marca Exemplo',category:'Skincare',price:119.9,stock:16,emoji:'✧',tone:'#dfe6d4'},
{id:'nv-003',name:'Balm Labial',brand:'Marca Exemplo',category:'Maquiagem',price:39.9,stock:32,emoji:'✳',tone:'#ead6d0'},
{id:'nv-004',name:'Eau de Parfum',brand:'Marca Exemplo',category:'Perfumes',price:199.9,stock:8,emoji:'✦',tone:'#e7dfc7'},
{id:'nv-005',name:'Shampoo de Tratamento',brand:'Marca Exemplo',category:'Cabelos',price:74.9,stock:19,emoji:'◌',tone:'#d5dfd1'},
{id:'nv-006',name:'Creme Facial Diário',brand:'Marca Exemplo',category:'Skincare',price:94.9,stock:12,emoji:'◍',tone:'#eee5dd'},
{id:'nv-007',name:'Blush Cremoso',brand:'Marca Exemplo',category:'Maquiagem',price:59.9,stock:21,emoji:'✳',tone:'#e9d5d0'},
{id:'nv-008',name:'Body Splash',brand:'Marca Exemplo',category:'Perfumes',price:69.9,stock:0,emoji:'✦',tone:'#dfe6d8'}];
function getProducts(){try{const x=JSON.parse(localStorage.getItem(NAVILLE_KEY));return Array.isArray(x)?x:NAVILLE_SEED.map(p=>({...p}));}catch{return NAVILLE_SEED.map(p=>({...p}));}}
function saveProducts(products){localStorage.setItem(NAVILLE_KEY,JSON.stringify(products));}
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function safeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
