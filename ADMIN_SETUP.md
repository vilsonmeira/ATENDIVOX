# ATENDIVOX — primeiro acesso do administrador

O app está publicado em https://atendivox.vercel.app e usa o projeto Supabase já configurado para o ATENDIVOX.

## Vincular a primeira conta administradora

1. No Supabase, abra Authentication → Users e crie o usuário com o e-mail que será do administrador (ou confirme que ele já existe).
2. Copie o e-mail usado na conta.
3. No SQL Editor, execute o comando abaixo substituindo `ADMIN_EMAIL@DOMINIO.COM` pelo e-mail exato:

```sql
insert into public.atendivox_staff
  (clinic_id, auth_user_id, display_name, role, active)
select
  'a7d1c0b1-3f4a-4f68-9d3a-6a1e2b7c9001'::uuid,
  u.id,
  'Administrador da clínica',
  'admin',
  true
from auth.users u
where lower(u.email) = lower('ADMIN_EMAIL@DOMINIO.COM')
on conflict do nothing;
```

Se não inserir nenhuma linha, confirme se o usuário foi criado e se o e-mail está correto. Não compartilhe senha com ninguém.

## Adicionar profissionais

Depois que o administrador inicial estiver vinculado, cada profissional deve ter uma conta criada em Authentication → Users. Um administrador autorizado deve inserir o vínculo em `atendivox_staff`, definindo um destes papéis: `reception`, `triage` ou `doctor`. Para médico, pode preencher `room_id` com o ID do consultório correspondente.

## Segurança e limites atuais

- RLS está habilitado nas seis tabelas ATENDIVOX.
- A equipe só consulta dados da clínica à qual está vinculada.
- A fila e os eventos de chamada são publicados no Realtime.
- O app usa somente a chave publishable no navegador; nenhuma service-role key é exposta.
- O painel de TV requer login de um membro da equipe.
- O acompanhamento público do paciente por QR/link individual e a gestão visual de usuários ainda não estão implementados.
- Antes de usar dados reais, a clínica deve validar seus procedimentos de LGPD, retenção, consentimento e controles internos. Esta primeira entrega não substitui uma avaliação jurídica ou de segurança clínica.
