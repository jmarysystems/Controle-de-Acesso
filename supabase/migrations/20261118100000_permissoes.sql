-- =====================================================================
-- Controle de Acesso — permissões por usuário e módulo
-- =====================================================================
begin;

create table if not exists public.acesso_permissoes (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  modulo          text not null,
  pode_cadastrar  boolean not null default false,
  pode_editar     boolean not null default false,
  pode_excluir    boolean not null default false,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid references public.usuarios(id) on delete set null,
  constraint acesso_permissoes_unica unique (usuario_id, modulo),
  constraint acesso_permissoes_modulo_check check (modulo in (
    'cotacao', 'armazenados', 'produtos', 'categoria', 'subcategoria', 'familia', 'usuario'
  ))
);

create index if not exists acesso_permissoes_usuario_idx
  on public.acesso_permissoes (usuario_id);

alter table public.acesso_permissoes enable row level security;

drop policy if exists "acesso le" on public.acesso_permissoes;
create policy "acesso le" on public.acesso_permissoes
  for select to authenticated
  using (
    public.tipo_usuario() in ('admin_sistema', 'administrador')
    or usuario_id = (select id from public.usuarios where auth_user_id = auth.uid() limit 1)
  );

drop policy if exists "acesso administra" on public.acesso_permissoes;
create policy "acesso administra" on public.acesso_permissoes
  for all to authenticated
  using (public.tipo_usuario() in ('admin_sistema', 'administrador'))
  with check (public.tipo_usuario() in ('admin_sistema', 'administrador'));

-- consulta amiga para os outros sistemas usarem depois
create or replace function public.tem_permissao(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((
    select case lower(p_acao)
             when 'cadastrar' then p.pode_cadastrar
             when 'editar'    then p.pode_editar
             when 'excluir'   then p.pode_excluir
             else false
           end
      from public.acesso_permissoes p
      join public.usuarios u on u.id = p.usuario_id
     where u.auth_user_id = auth.uid()
       and p.modulo = p_modulo
       and u.ativo
     limit 1
  ), false)
$$;

revoke execute on function public.tem_permissao(text, text) from public;
grant execute on function public.tem_permissao(text, text) to authenticated;

commit;
