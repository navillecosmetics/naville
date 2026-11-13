# Naville Cosmetics — Base inicial (protótipo)

Primeira versão de interface para a loja multimarcas Naville Cosmetics, utilizando os arquivos originais de logotipo e isotipo fornecidos.

## Conteúdo
- `index.html`: home responsiva, categorias, busca, vitrine, carrinho de demonstração e newsletter ilustrativa.
- `admin.html`: protótipo de painel com visão geral, CRUD de produtos fictícios e área de pedidos ainda não conectada.
- `styles.css`: identidade visual e responsividade.
- `data.js`: catálogo fictício compartilhado entre as duas páginas.
- `app.js` e `admin.js`: interações demonstrativas.
- `assets/`: logotipo e isotipo originais.

## Como visualizar
Abra `index.html` no navegador. Para o painel, abra `admin.html`. Também é possível publicar como site estático no GitHub Pages.

## Limitações importantes
**Não é um e-commerce pronto para produção.** Não há login, controle de acesso, servidor, banco de dados remoto, pagamento, cálculo de frete, integração fiscal ou pedidos reais. O carrinho não efetua compras. O painel é **público** caso publicado no GitHub Pages e não deve conter informações confidenciais. A persistência demonstrativa usa `localStorage` e só funciona no mesmo navegador/origem; ela não sincroniza estoque entre dispositivos nem impede compras concorrentes. Produtos e preços são fictícios. A newsletter não envia nem armazena e-mails.

## Próxima etapa técnica
1. Definir arquitetura de produção (por exemplo, Next.js + Supabase) e ambiente de implantação adequado; GitHub Pages é apenas hospedagem estática.
2. Criar banco de dados com tabelas para produtos, marcas, categorias, variantes/SKUs, estoque, clientes, pedidos, itens de pedido e movimentações.
3. Implementar autenticação de administradores, papéis, permissões e políticas RLS no Supabase.
4. Criar APIs seguras e transações atômicas para estoque/reservas e processamento de pedidos.
5. Integrar provedor de pagamentos por API e validar webhooks no servidor, com idempotência.
6. Integrar frete, ERP/notas fiscais, políticas legais, LGPD e observabilidade.
7. Substituir o catálogo demonstrativo por produtos e imagens licenciados reais.

## GitHub
Crie um repositório vazio e envie **o conteúdo desta pasta** para a raiz. Em Settings → Pages, selecione Deploy from a branch, branch `main`, pasta `/ (root)`. A home será servida pelo `index.html`. O painel `admin.html` estará acessível publicamente apenas como demo.
