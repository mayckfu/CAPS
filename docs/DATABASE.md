# Arquitetura de Banco de Dados

Backend: Firebase Authentication + Cloud Firestore.

## Objetivo

Cada usuario autenticado possui um espaco isolado de dados. O sistema salva cadastro, prontuario, fichas de atendimento, agenda e auditoria abaixo de `users/{uid}`.

## Arvore de Dados

### Perfil do Usuário (Privado)
`users/{uid}`: Contém metadados do profissional (email, versão do schema, data de acesso).

### Dados da Unidade (Compartilhado)
As coleções abaixo estão na raiz do banco e são acessíveis por todos os profissionais autenticados da unidade:

- `patients/{patientId}`: Cadastro completo.
- `records/{recordId}`: Fichas de atendimento (BPA/Produção).
- `appointments/{appointmentId}`: Agenda da unidade.
- `clinicalEntries/{entryId}`: Evoluções do prontuário.
- `auditLogs/{auditId}`: Logs de ações (quem criou/editou o quê).


## Entidades

### patients

Dados cadastrais e campos normalizados para busca.

Campos principais:

- `id`
- `ownerUid`
- `schemaVersion`
- `nome`
- `cns`
- `cpf`
- `dataNasc`
- `sexo`
- `raca`
- `nomeMae`
- `telefone`
- `logradouro`, `numero`, `descEndereco`, `cep`, `municipio`
- `searchText`
- `cnsDigits`, `cpfDigits`, `telefoneDigits`
- `createdAt`, `updatedAt`
- `isDeleted`

### clinicalEntries

Evolucoes clinicas do prontuario.

- `id`
- `ownerUid`
- `patientId`
- `dataAtendimento`
- `tipo`
- `risco`
- `profissional`
- `cid`
- `subjetivo`
- `objetivo`
- `avaliacao`
- `plano`
- `createdAt`, `updatedAt`
- `isDeleted`

### records

Ficha de atendimento e producao mensal usada na impressao.

- `id`
- `ownerUid`
- `patientId`
- `mesRef`
- `nomeProfissional`
- `cartaoSusProfissional`
- `cbo`
- `localRealizacao`
- `cidPrincipal`
- `cidCausas`
- `cidAcolhimento`
- `origemUsuario`
- `destinoUsuario`
- `coberturaEsf`
- `unidadeEsf`
- campos dinamicos por procedimento, por exemplo `0301080208_d12`
- `createdAt`, `updatedAt`
- `isDeleted`

### appointments

Agenda.

- `id`
- `ownerUid`
- `patientId`
- `patientName`
- `date`
- `hora`
- `dateTimeKey`
- `observacao`
- `createdAt`, `updatedAt`
- `isDeleted`

### auditLogs

Historico tecnico de operacoes.

- `id`
- `ownerUid`
- `action`: `create`, `update`, `delete`, `deleteCascade`, `import`
- `entityType`
- `entityId`
- `details`
- `createdAt`, `updatedAt`
- `schemaVersion`

## Regras de Seguranca

Arquivo: `firestore.rules`

Principio:

- Somente usuários autenticados têm acesso ao sistema.
- Dados de pacientes e prontuários são compartilhados entre todos os profissionais da unidade.
- O campo `ownerUid` em cada documento registra quem criou/editou o registro, mas não bloqueia o acesso de outros profissionais.
- Perfis de usuário (`/users/{uid}`) continuam privados e isolados por UID.


## Indices

Arquivo: `firestore.indexes.json`

Indices cobrem os padroes atuais:

- fichas por paciente ordenadas por criacao;
- evolucoes por paciente ordenadas por data;
- agenda por data;
- agenda por paciente;
- agenda por data + paciente.

## Deploy

Instale o Firebase CLI uma vez:

```bash
npm install -g firebase-tools
```

Login:

```bash
firebase login
```

Vincule ao projeto:

```bash
firebase use sms-caps
```

Publique regras e indices:

```bash
firebase deploy --only firestore
```

## Observacoes

- O app usa `schemaVersion` para permitir migracoes futuras.
- Datas estao em ISO string para manter compatibilidade com as telas atuais.
- A relacao entre documentos e feita por `patientId`.
- Exclusao de paciente remove fichas, agenda e evolucoes vinculadas por batch.
