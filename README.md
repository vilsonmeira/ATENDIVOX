# ATENDIVOX

Sistema de demonstração para fluxo de atendimento em clínica: recepção, triagem, fila médica, painel de TV e acompanhamento do paciente.

## Executar
Abra `index.html` em um navegador moderno. O modo de demonstração salva os registros no armazenamento local do navegador. Duas abas no mesmo navegador recebem atualizações locais; isso **não** equivale à sincronização segura entre dispositivos diferentes.

## Backend
Foi reservado um conjunto isolado de tabelas `atendivox_*` no projeto Supabase existente `vilsonmeira's Project`. As tabelas têm RLS ativado e permanecem sem políticas de acesso até que autenticação, papéis e autorização por clínica sejam implementados. Não desative RLS e não exponha chaves secretas no navegador.

## Próximas etapas obrigatórias antes de uso real
1. Configurar Supabase Auth e perfis com papéis (admin, recepção, triagem, médico).
2. Criar políticas RLS testadas por usuário e por clínica.
3. Integrar operações de fila e Supabase Realtime.
4. Criar links/QR individuais para pacientes sem expor dados pessoais.
5. Validar privacidade, auditoria, backups e requisitos LGPD.
6. Testar o fluxo em celulares, computador da recepção, TV e consultório.

**Aviso:** esta versão é um protótipo funcional local para demonstração, não está pronta para dados reais de pacientes ou operação clínica.
