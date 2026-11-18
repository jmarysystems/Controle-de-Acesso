# Controle de Acesso

Sistema que define **o que cada usuário pode fazer** em cada módulo da JMarySystems.

## Como funciona

1. Login com CPF/CNPJ (mesma identidade dos outros sistemas, via Supabase Auth).
2. Escolha o usuário na lista à esquerda.
3. Marque, para cada módulo, o que ele pode **Cadastrar**, **Editar** e **Excluir**.
4. Salvar.

## Módulos

| Módulo | Chave |
|---|---|
| Cotação | `cotacao` |
| Armazenados e Não Expostos | `armazenados` |
| Produtos | `produtos` |
| Categoria | `categoria` |
| Subcategoria | `subcategoria` |
| Família | `familia` |
| Usuário | `usuario` |

## Banco

Tabela `acesso_permissoes` (uma linha por usuário × módulo), no mesmo projeto
Supabase dos outros sistemas.

- `unique (usuario_id, modulo)` — a tela salva com upsert.
- Só `admin_sistema` e `administrador` leem e gravam (RLS).
- Função `tem_permissao(modulo, acao)` pronta para os outros sistemas consultarem.

## Estrutura

```
index.html
assets/
  config.js       URL e chave publicável do Supabase
  api.js          Auth, consultas
  ui.js           formatação, modais, toasts
  app.js          login, layout e rotas
  styles.css
  views/permissoes.js
supabase/migrations/
```

## Rodar localmente

```bash
python -m http.server 5500
# http://localhost:5500
```
