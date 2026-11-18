// Shell: login, layout e rotas.
import { sb, sair, sessao, meuPerfil, entrar } from './api.js';
import { SISTEMA } from './config.js';
import * as ui from './ui.js';
import * as permissoes from './views/permissoes.js';

const app = document.getElementById('app');
let perfil = null;

const ROTULOS = {
  admin_sistema: 'Administrador do Sistema',
  administrador: 'Administrador',
  leitura: 'Leitura',
  fornecedor: 'Fornecedor',
  armazenados: 'Armazenados',
};

const PODE_GERENCIAR = ['admin_sistema', 'administrador'];

function telaLogin(mensagem = '') {
  app.innerHTML = `
    <div class="tela-login">
      <form class="cartao-login" id="form-login">
        <div class="marca"><span class="marca-icone">▣</span>${ui.esc(SISTEMA)}</div>
        <h1>Entrar</h1>
        <p class="sub">Acesso com CPF/CNPJ e senha.</p>
        ${mensagem ? `<div class="erro-login">${ui.esc(mensagem)}</div>` : ''}
        <label class="campo"><span>CPF/CNPJ ou e-mail</span>
          <input name="documento" autocomplete="username" required autofocus></label>
        <label class="campo"><span>Senha</span>
          <input name="senha" type="password" autocomplete="current-password" required></label>
        <button class="botao-primario" style="width:100%" type="submit">Entrar</button>
      </form>
    </div>`;

  const form = document.getElementById('form-login');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = form.querySelector('button');
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    try {
      await entrar(form.documento.value, form.senha.value);
      perfil = await meuPerfil();
      if (!perfil) throw new Error('Sua conta não tem perfil de usuário.');
      if (!PODE_GERENCIAR.includes(perfil.tipo)) {
        throw new Error('Somente administradores podem gerenciar o acesso.');
      }
      iniciarApp();
    } catch (erro) {
      await sair();
      telaLogin(erro.message);
    }
  });
}

function iniciarApp() {
  app.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="marca"><span class="marca-icone">▣</span>${ui.esc(SISTEMA)}</div>
        <nav>
          <a class="nav-item ativo" href="#/permissoes"><span class="icone">☰</span>Permissões</a>
          <a class="nav-item" href="#/usuarios"><span class="icone">◉</span>Usuários</a>
        </nav>
        <div class="sidebar-rodape">
          <div class="quem">${ui.esc(perfil.nome)}</div>
          <div class="papel">${ui.esc(ROTULOS[perfil.tipo] || perfil.tipo)}</div>
          <button type="button" id="sair">Sair</button>
        </div>
      </aside>
      <div class="conteudo">
        <header class="topbar"><h1 id="titulo">Permissões</h1></header>
        <main id="view"><div class="carregando">Carregando…</div></main>
      </div>
    </div>`;

  document.getElementById('sair').addEventListener('click', async () => {
    await sair();
    perfil = null;
    telaLogin('Você saiu.');
  });

  if (!location.hash) location.hash = '#/permissoes';
  window.addEventListener('hashchange', navegar);
  navegar();
}

async function navegar() {
  const raiz = document.getElementById('view');
  if (!raiz) return;
  const caminho = (location.hash || '#/permissoes').replace(/^#\/?/, '');
  const [seg, arg] = caminho.split('/');

  for (const link of document.querySelectorAll('.nav-item')) {
    const rota = link.getAttribute('href').replace(/^#\//, '').split('/')[0];
    link.classList.toggle('ativo', rota === seg);
  }

  const ctx = {
    perfil,
    irPara: (hash) => { location.hash = hash; },
    recarregar: () => navegar(),
    setTitulo: (texto) => {
      document.getElementById('titulo').textContent = texto;
      document.title = `${texto} · ${SISTEMA}`;
    },
  };

  raiz.innerHTML = '<div class="carregando">Carregando…</div>';

  try {
    if (seg === 'usuarios') return await permissoes.listaUsuarios(raiz, ctx);
    return await permissoes.permissoes(raiz, ctx, arg);
  } catch (erro) {
    raiz.innerHTML = `<div class="cartao"><h2>Não foi possível carregar</h2>
      <p class="sub">${ui.esc(erro.message)}</p></div>`;
  }
}

sb.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT' && perfil) {
    perfil = null;
    telaLogin('Sessão encerrada.');
  }
});

(async function iniciar() {
  try {
    const s = await sessao();
    if (!s) return telaLogin();
    perfil = await meuPerfil();
    if (!perfil || !PODE_GERENCIAR.includes(perfil.tipo)) {
      await sair();
      return telaLogin('Somente administradores podem gerenciar o acesso.');
    }
    iniciarApp();
  } catch (erro) {
    telaLogin(erro.message);
  }
})();
