// Catálogo de categorias demonstrativo: persistência apenas neste navegador.
const CATEGORY_KEY='naville-demo-categories-v1';
const CATEGORY_DEFAULT=[
{id:'cabelos',name:'Cabelos',description:'Seu melhor cuidado',active:true,image:'',tone:'#e9dfcd',symbol:'◌'},
{id:'maquiagem',name:'Maquiagem',description:'Expresse seu estilo',active:true,image:'',tone:'#ead6d0',symbol:'✳'},
{id:'skincare',name:'Skincare',description:'Rotina de autocuidado',active:true,image:'',tone:'#dfe6d4',symbol:'◍'},
{id:'perfumes',name:'Perfumes',description:'Sua assinatura',active:true,image:'',tone:'#e7e1d6',symbol:'✦'}];
function getCategories(){try{const v=JSON.parse(localStorage.getItem(CATEGORY_KEY));return Array.isArray(v)?v:CATEGORY_DEFAULT.map(c=>({...c}));}catch{return CATEGORY_DEFAULT.map(c=>({...c}));}}
function saveCategories(items){localStorage.setItem(CATEGORY_KEY,JSON.stringify(items));window.dispatchEvent(new Event('naville-categories-updated'));}
function categorySlug(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);}
function categoryImage(src){return typeof src==='string'&&/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src)?src:'';}
function categoryByName(name){return getCategories().find(c=>c.name===name);}
