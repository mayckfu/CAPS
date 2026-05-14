# Plano de Melhorias e Pendências - Projeto CAPS

Este documento lista as melhorias identificadas e as tarefas pendentes para a evolução do sistema, com foco em uma unidade de saúde compartilhada.

## 🏗️ Estrutura e Lógica de Dados
- [ ] **Migração para Prontuário Compartilhado**: Refatorar o banco de dados para que os pacientes não fiquem isolados por usuário, mas sim acessíveis a todos os profissionais da unidade.
- [ ] **Roteamento Dinâmico**: Implementar `react-router-dom` para suportar URLs amigáveis (ex: `/paciente/123`) e navegação por histórico do navegador.
- [ ] **Soft Delete Consistente**: Garantir que a exclusão de qualquer entidade apenas marque o campo `isDeleted: true` em vez de remover o documento fisicamente (exigência para auditoria de saúde).

## 💾 Backend (Firebase)
- [ ] **Habilitar Persistência Offline**: Configurar o Firestore para cache local agressivo, permitindo uso em conexões instáveis de celulares.
- [ ] **Cloud Functions**: Preparar funções de backend para processamento de relatórios pesados (BPA-I/BPA-C).
- [ ] **Validação de Schema**: Adicionar camadas de validação (Zod) antes de enviar dados ao Firebase.

## 📱 Frontend e UX
- [ ] **Design Responsivo Pro Max**: Revisar todos os formulários (`RecordForm`, `PatientForm`) para garantir usabilidade perfeita em telas pequenas de celulares.
- [ ] **Feedback de Conexão**: Adicionar um indicador visual de "Modo Offline" ou "Sincronizando" para dar segurança ao profissional.
- [ ] **Impressão Mobile**: Ajustar o fluxo de impressão para funcionar bem em navegadores mobile (geração de PDF).

## 🔒 Segurança e Usuários
- [ ] **Perfis de Acesso (Roles)**: Diferenciar o que um "Administrador", "Médico" ou "Recepcionista" pode fazer/ver.
- [ ] **MFA (Multi-Factor Authentication)**: Implementar na segunda fase, conforme solicitado.
- [ ] **Auditoria Detalhada**: Expandir os `auditLogs` para registrar exatamente qual campo foi alterado em cada edição.

## 🔍 SEO e Metadados (Acesso Interno)
- [ ] **Bloqueio de Indexação**: Como é um sistema de dados sensíveis, garantir que robôs de busca (Google, etc.) nunca indexem o conteúdo (`noindex`).
- [ ] **PWA (Progressive Web App)**: Permitir "Instalar" o app no celular como se fosse um aplicativo nativo.
