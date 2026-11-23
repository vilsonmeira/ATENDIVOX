# ATENDIVOX

Sistema web para fluxo de atendimento em clínica: recepção, triagem, fila médica e painel de chamadas.

## Acessar
Produção: https://atendivox.vercel.app

## Arquitetura atual
- Frontend estático hospedado na Vercel e vinculado ao GitHub.
- Supabase Auth com e-mail e senha para membros previamente vinculados à equipe.
- Supabase Postgres com tabelas isoladas `atendivox_*` e Row Level Security habilitado.
- Supabase Realtime para atualizar a fila em outros dispositivos.
- Papéis: `admin`, `reception`, `triage`, `doctor` e `nursing`.
- Módulo de medicação: prescrições vinculadas ao atendimento, fila da enfermagem, chamadas discretas na TV e histórico de administração/recusa/não administração.
- A TV exibe apenas senha e destino; não exibe nome, diagnóstico ou nome do medicamento.
- A função de emissão usa uma sequência do banco para gerar senhas sem colisões.
- A chave publishable é a única chave Supabase presente no navegador; não há service-role key no frontend.

## Primeiro administrador
Siga [ADMIN_SETUP.md](./ADMIN_SETUP.md) para criar a conta no Supabase Auth e vincular o primeiro administrador à clínica de demonstração. Sem esse vínculo, o login é recusado por segurança.

## Módulo de medicação
- Médico/admin registra prescrição; enfermagem/admin chama e registra o desfecho.
- Tipos previstos: comprimido, injeção, soro, intravenoso, nebulização e outros.
- As tabelas `atendivox_medication_orders` e `atendivox_medication_administrations` têm RLS por clínica e estão habilitadas no Realtime.
- A sala de teste `Sala de Medicação` é criada na clínica de demonstração.

## Limites desta entrega
- A tela da TV usa login de um membro da equipe.
- A gestão visual de usuários e o acompanhamento público do paciente por QR/link individual ainda não foram implementados.
- Antes de cadastrar pacientes reais, a clínica deve concluir avaliação de segurança, LGPD, retenção, consentimento, backup e procedimentos internos. Esta versão não é certificação de conformidade nem substitui avaliação profissional.

As tabelas e políticas criadas para o ATENDIVOX são isoladas por prefixo e não alteram os dados dos outros aplicativos no mesmo projeto Supabase.
