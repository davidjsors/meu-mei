# Guia de Responsividade e Design Mobile-First — MeuMEI

Este documento descreve as decisões arquiteturais e padrões de CSS utilizados para garantir que o MeuMEI ofereça uma experiência premium e fluida em dispositivos móveis (especialmente iOS/Safari e Android/Chrome), mantendo a consistência com a versão Desktop.

---

## 1. Fundamentos Técnicos

### 1.1. Suporte a Safe Areas (Notch)
Para dispositivos com "notch" (entalhe) ou barras de gestos, utilizamos o padrão de preenchimento do visor total:
- **Meta Tag**: No `layout.js`, incluímos `viewport-fit=cover`.
- **CSS Insets**: Utilizamos `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` para garantir que cabeçalhos e inputs não fiquem ocultos sob componentes de hardware ou do sistema.

### 1.2. Viewport Dinâmica (DVH)
Para evitar que a barra de endereços do navegador mobile "quebre" o layout ou oculte botões no fundo da tela, utilizamos:
- `min-height: 100dvh` — Garante que o container ocupe 100% da área visível real, ajustando-se dinamicamente conforme as barras do navegador aparecem/somem.

### 1.3. Scroll e Pull-to-Refresh
- **Interatividade**: O `overflow-y: auto` é mantido no `body` para permitir o gesto nativo de "puxar para atualizar" (pull-to-refresh) em navegadores mobile.
- **Isolamento**: Containers internos como `.messages-container` e `.sidebar-content` gerenciam seu próprio scroll para manter o cabeçalho fixo (`position: sticky`).

---

## 2. Padrões de Layout

### 2.1. Cabeçalhos Unificados (Headers)
Para garantir uma linha visual contínua, os cabeçalhos foram padronizados:
- **Altura Base**: 64px.
- **Mobile**: A altura real é calculada como `calc(64px + env(safe-area-inset-top))`.
- **Alinhamento**: Centralização horizontal automática do título/logo, com botões de ação (menu/fechar) posicionados de forma absoluta nas extremidades.

### 2.2. Comportamento da Sidebar
- **Desktop (>= 769px)**: Estática, lateral, com largura fixa de 380px.
- **Mobile (<= 768px)**: Drawer flutuante (`position: fixed`) que ocupa 100% da tela, acionado via `transform: translateX` para performance suave.

### 2.3. Área de Chat e Mensagens
- **Input Flutuante**: No mobile, o campo de texto utiliza `width: 94%` e `position: fixed` com margem de segurança para a barra de gestos do iOS.
- **Espaçamento**: O contêiner de mensagens possui um `padding-bottom` generoso (140px no mobile) para garantir que a última mensagem nunca fique atrás do teclado ou do campo de input.

---

## 3. UI/UX e Acessibilidade Mobile

### 3.1. Teclados Inteligentes
Para melhorar a velocidade de preenchimento, campos específicos forçam o teclado correto:
- **Telefone/PIN/Metas**: Utilizam `type="tel"` ou `inputMode="numeric"` para abrir o teclado numérico direto.
- **Inputs de Texto**: `fontSize: 16px` (mínimo) para evitar o "auto-zoom" indesejado do iOS ao focar em campos de formulário.

### 3.2. Contraste e Logos
- **Logo no Chat**: Devido à logo original ser vermelha, aplicamos `filter: brightness(0) invert(1)` no cabeçalho do chat (fundo vermelho) para garantir que o "M" apareça branco.
- **Escalabilidade**: Logos em círculos de 32px são configuradas com `width: 80%` para garantir uma margem de respiro (padding visual) consistente.

---

## 4. Checklist para Novas Funcionalidades
Ao adicionar novos componentes, verifique:
1. [ ] Respeita as safe areas no iPhone?
2. [ ] O teclado que abre é o mais adequado (texto vs número)?
3. [ ] Funciona tanto em modo Portrait quanto Landscape (orientação)?
4. [ ] O tamanho dos botões permite o toque fácil (mínimo 44x44px)?
