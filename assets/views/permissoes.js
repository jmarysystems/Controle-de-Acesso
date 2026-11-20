// Permissões por usuário e módulo.
import { listar, sb, traduzErro } from '../api.js';
import * as ui from '../ui.js';

const MODULOS = [
  { chave: 'cotacao', nome: 'Cotação' },
  { chave: 'pedido', nome: 'Pedido de Compra' },
  { chave: 'armazenados', nome: 'Armazenados e Não Expostos' },
  { chave: 'produtos', nome: 'Produtos' },
  { chave: 'categoria', nome: 'Categoria' },
  { chave: 'subcategoria', nome: 'Subcategoria' },
  { chave: 'familia', nome: 'Família' },
  { chave: 'marca', nome: 'Marca' },
  { chave: 'fornecedor', nome: 'Fornecedor' },
  { chave: 'estabelecimento', nome: 'Estabelecimento' },
  { chave: 'ncm', nome: 'NCM' },
  { chave: 'cest', nome: 'CEST' },
  { chave: 'xml', nome: 'Baixar XML' },
  { chave: 'usuario', nome: 'Usuário' },
];

const ACOES = [
  { chave: 'pode_cadastrar', nome: 'Cadastrar' },
  { chave: 'pode_editar', nome: 'Editar' },
  { chave: 'pode_excluir', nome: 'Excluir' },
];

const ROTULOS = {
  admin_sistema: 'Administrador do Sistema',
  administrador: 'Administrador',
  leitura: 'Leitura',
  fornecedor: 'Fornecedor',
  armazenados: 'Armazenados',
};

async function carregarUsuarios() {
  return listar('usuarios', { ordem: 'nome' });
}

async function carregarPermissoes(usuarioId) {
  const linhas = await listar('acesso_permissoes', { eq: { usuario_id: usuarioId } });
  const mapa = {};
  for (const l of linhas) mapa[l.modulo] = l;
  return mapa;
}

export async function listaUsuarios(raiz, ctx) {
  ctx.setTitulo('Usuários');
  const usuarios = await carregarUsuarios();

  raiz.innerHTML = `
    <div class="cartao">
      <div class="cartao-topo"><h2>${usuarios.length} usuário(s)</h2></div>
      <div class="tabela-rolagem"><table>
        <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          ${usuarios.map((u) => `<tr>
            <td>${ui.esc(u.nome)}</td>
            <td class="mono">${ui.esc(u.cpf_cnpj)}</td>
            <td>${ui.esc(ROTULOS[u.tipo] || u.tipo)}</td>
            <td>${u.ativo ? 'ativo' : 'inativo'}</td>
            <td><a class="botao botao-pequeno" href="#/permissoes/${ui.esc(u.id)}">Permissões</a></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

export async function permissoes(raiz, ctx, usuarioId) {
  ctx.setTitulo('Permissões');
  const usuarios = await carregarUsuarios();
  if (!usuarios.length) {
    raiz.innerHTML = ui.vazio('Nenhum usuário cadastrado.');
    return;
  }

  const atual = usuarios.find((u) => u.id === usuarioId) || usuarios[0];
  const mapa = await carregarPermissoes(atual.id);

  const lista = usuarios.map((u) => `
    <button type="button" data-usuario="${ui.esc(u.id)}"
      class="${u.id === atual.id ? 'ativo' : ''}">
      <span>
        <span class="nome">${ui.esc(u.nome)}</span><br>
        <span class="doc">${ui.esc(u.cpf_cnpj)} · ${ui.esc(ROTULOS[u.tipo] || u.tipo)}</span>
      </span>
      <span class="sub">${u.ativo ? 'ativo' : 'inativo'}</span>
    </button>`).join('');

  const linhas = MODULOS.map((m) => {
    const p = mapa[m.chave] || {};
    return `<tr>
      <td><strong>${ui.esc(m.nome)}</strong></td>
      ${ACOES.map((a) => `<td class="acao">
        <input type="checkbox" data-modulo="${ui.esc(m.chave)}" data-acao="${ui.esc(a.chave)}"
          ${p[a.chave] ? 'checked' : ''}>
      </td>`).join('')}
    </tr>`;
  }).join('');

  raiz.innerHTML = `
    <div class="duas-colunas">
      <div class="cartao">
        <div class="cartao-topo"><h2>Usuários</h2></div>
        <div class="lista-usuarios">${lista}</div>
      </div>

      <div class="cartao">
        <div class="cartao-topo">
          <h2>Permissões — ${ui.esc(atual.nome)}</h2>
          <button type="button" class="botao-primario" id="salvar">Salvar</button>
        </div>
        <p class="sub">Marque o que este usuário pode fazer em cada módulo.</p>
        <div class="tabela-rolagem"><table class="matriz">
          <thead><tr><th>Módulo</th>${ACOES.map((a) => `<th class="acao">${ui.esc(a.nome)}</th>`).join('')}</tr></thead>
          <tbody>${linhas}</tbody>
        </table></div>
      </div>
    </div>`;

  for (const b of raiz.querySelectorAll('[data-usuario]')) {
    b.addEventListener('click', () => { ctx.irPara(`#/permissoes/${b.dataset.usuario}`); });
  }

  raiz.querySelector('#salvar').addEventListener('click', async (ev) => {
    const botao = ev.target;
    botao.disabled = true;
    botao.textContent = 'Salvando…';

    const registros = MODULOS.map((m) => {
      const linha = { usuario_id: atual.id, modulo: m.chave };
      for (const a of ACOES) {
        const el = raiz.querySelector(
          `[data-modulo="${m.chave}"][data-acao="${a.chave}"]`);
        linha[a.chave] = !!(el && el.checked);
      }
      return linha;
    });

    try {
      const { error } = await sb.from('acesso_permissoes')
        .upsert(registros, { onConflict: 'usuario_id,modulo' });
      if (error) throw new Error(traduzErro(error));
      ui.toast('Permissões salvas.');
    } catch (erro) {
      ui.toast(erro.message, 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  });
}
