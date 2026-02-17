# Auditoria de Mensagens do Usuário - Meu MEI

Este documento lista todas as mensagens, instruções e erros apresentados ao usuário durante o uso do aplicativo, organizados por fluxo.

---

## 1. Fluxo de Onboarding (Cadastro Inicial)
**Arquivo:** `frontend/src/app/onboarding/page.js`

### Etapa 0: Telefone
- **Título/Subtítulo:**
  - "Digite seu telefone para começar sua jornada rumo à independência financeira."
- **Label:** "Seu telefone"
- **Placeholder:** "11-98765-4321"
- **Botão:** "Continuar →" (Carregando: "Verificando...")
- **Nota de rodapé:** "Sua conta é vinculada ao seu número."
- **Erros:**
  - "Por favor, informe seu celular completo com DDD."

### Etapa 2: Perfil e Criação de Senha
- **Título:** "Bem-vindo(a) ao Meu MEI!"
- **Subtítulo:** "Conte um pouco sobre você e o seu negócio, e defina sua senha de acesso."
- **Campos:**
  - **Nome:** Label "Nome", Placeholder "Seu nome"
  - **Profissão:** Label "Profissão", Placeholder "Ex: Eletricista..."
  - **Sonho:** Label "Qual o seu maior sonho relacionado ao seu negócio?", Placeholder "Ex: Abrir minha loja física..."
- **Criação de PIN:**
  - **Aviso:** "Atenção: Guarde bem este número! Ele será sua senha para entrar no aplicativo sempre que precisar."
  - **Input:** Placeholder "PIN (4-6 dígitos)"
  - **Confirmação:** Placeholder "Confirme o PIN"
- **Botão:** "Tudo pronto! Vamos continuar →" (Carregando: "Salvando...")
- **Erros:**
  - "Opa! Como podemos te chamar? Informe seu nome."
  - "Qual a sua profissão? (ex: Eletricista)"
  - "Conte para a gente qual o seu maior sonho!"
  - "Crie um PIN de pelo menos 4 números."
  - "Os PINs informados não são iguais."
  - "Os códigos informados não coincidem" (feedback visual abaixo do campo)

### Etapa 3: Introdução à Maturidade
- **Título:** "Quase lá! Vamos falar da gestão do seu negócio?"
- **Texto:** "Agora que conhecemos seu sonho, precisamos entender como você gerencia as finanças da sua empresa. O objetivo é termos um diagnóstico inicial para que possamos te ajudar a conquistar o seu sonho com segurança!"
- **Botões:** "Voltar", "Começar"

### Etapa 4: Questionário de Maturidade
- **Perguntas:**
  1. "Você costuma registrar todas as entradas e saídas do seu negócio? Tipo, anota tudo certinho o que vende e o que gasta?"
  2. "E sobre as contas: você usa conta separada pra vida pessoal e pro negócio, ou tá tudo junto ainda?"
  3. "Quando chega a hora de pagar os boletos, você já sabe de antemão se vai ter dinheiro? Você acompanha isso?"
  4. "Você costuma buscar aprender sobre gestão financeira? Cursos, vídeos, dicas..."
  5. "Na hora de colocar preço no que você vende, você sabe direitinho quanto gasta pra produzir e quanto sobra de lucro?"
- **Opções de Resposta:** (Variam de "Não anoto nada" a "Registro cada centavo", etc. - Ver arquivo original para lista completa).

### Etapa 5: Meta de Faturamento
- **Título:** "Sua Meta Mensal"
- **Subtítulo:** "Para te ajudar a focar no que importa, qual o valor de faturamento você deseja atingir este mês?"
- **Label:** "1. Meta mensal de faturamento"
- **Placeholder:** "0,00"
- **Botão:** "Continuar →"
- **Erro:** "Informe sua meta de vendas para este mês."

### Etapa 6: Saldo Inicial
- **Título:** "Seu Ponto de Partida"
- **Subtítulo:** "Para começar com o pé direito, quanto você tem hoje em caixa para o seu negócio? (Este valor será seu saldo inicial no aplicativo)"
- **Label:** "Saldo Atual (Dinheiro em mãos + Banco)"
- **Placeholder:** "0,00"
- **Botão:** "Salvar e Continuar →" (Carregando: "Salvando...")
- **Erro:** "Informe seu saldo atual para podermos começar seu controle."

### Etapa 7: Termos de Uso
- **Título:** "Está quase tudo pronto!"
- **Subtítulo:** "Para sua segurança, leia e aceite nossos termos de uso para começar."
- **Texto dos Termos:** "Bem-vindo ao Meu MEI... (texto completo no código)"
- **Botão:** "Aceitar e Finalizar Cadastro" (Carregando: "Criando sua conta...")
- **Erro de Finalização:** "Erro ao finalizar cadastro. Tente novamente." (Genérico se falhar na API).
- **Validação:** "Opa! Você precisa aceitar os termos para começarmos."

---

## 2. Fluxo de Login
**Arquivo:** `frontend/src/app/login/page.js`

### Identificação (Passo 1)
- **Título:** "Bem-vindo!"
- **Subtítulo:** "Digite seu telefone para entrar."
- **Placeholder:** "11-99999-9999"
- **Botão:** "Continuar"
- **Link:** "Não tem conta? Cadastre-se"
- **Erro:** "Telefone inválido"

### Senha/PIN (Passo 2)
- **Título:** "Olá, [Nome]!"
- **Subtítulo:** "Digite seu PIN de acesso."
- **Placeholder:** "••••"
- **Botão:** "Entrar"
- **Link:** "Trocar telefone"
- **Botão Esqueci Senha:** "Esqueci meu PIN" -> Exibe: "Para recuperar, envie e-mail para: david.sors@gmail.com"
- **Erros:**
  - "PIN incorreto" (Vem da API)

---

## 3. Sidebar e Navegação
**Arquivo:** `frontend/src/components/Sidebar.js`

### Cabeçalho
- **Título App:** "Meu MEI"
- **Slogan:** "finanças em dia, dinheiro no bolso"
- **Saudação:** "Eu sou [Profissão] e meu sonho é [Sonho]."

### Resumo Financeiro
- **Título:** "Resumo Financeiro"
- **Labels:** "Entradas", "Saídas", "Saldo"
- **Action:** "Toque para ver detalhes →"

### Meta de Vendas
- **Título:** "Meta de Vendas"
- **Botões:** Salvar (Meta), Cancelar
- **Placeholder de Edição:** "0,00"
- **Tooltip/Label:** "Defina sua meta de vendas para este mês:"

### Ações Rápidas (Botões)
- **Botão 1:** "Entrou Dindin" (Ícone TrendingUp)
- **Botão 2:** "Saiu Dindin" (Ícone TrendingDown)
- **Formulário Rápido:**
  - "Valor (R$) *"
  - "Categoria *" (Dropdown: Vendas, Serviços, Insumos, Aluguel, etc.)
  - "Descrição (opcional)"
  - **Botões:** "Cancelar", "Enviar"

### Rodapé Sidebar
- **Botão:** "Termos"
- **Botão:** "Sair" (Logout)
- **Motive-se:** (Cartão com frase do dia) "Motive-se para alcançar o seu sonho"

### Modal de Exclusão de Conta
- **Título:** "Excluir Conta"
- **Mensagem:** "Tem certeza absoluta? Isso apagará todos os seus dados e histórico financeiro permanentemente. Essa ação não pode ser desfeita."
- **Botão Confirmar:** "Excluir Definitivamente"
- **Botão Cancelar:** Cancelar (fechar modal)

---

## 4. Interface de Chat
**Arquivo:** `frontend/src/app/chat/page.js`

### Cabeçalho
- **Status:** "online" ou "digitando..."

### Carregamento Inicial
- **Tela de Splash:**
  - "Tudo pronto para o seu sucesso!"
  - "Carregando o Meu MEI..."

### Mensagens do Sistema (Frontend)
- **Mensagem Automática ao entrar pela 1ª vez:** "Olá! Acabei de chegar e quero começar minha mentoria. Me explique como você pode me ajudar?" (Enviada automaticamente em nome do usuário se tour completado/pulado).

---

## 5. Erros e Respostas de API (Backend & Utils)
**Arquivos:** `backend/app/routers/*.py`, `frontend/src/lib/utils.js`

### Erros de Autenticação (Backend)
- "Token inválido" (400)
- "Usuário não encontrado" (404)
- "PIN não configurado. Cadastre-se primeiro." (400)
- "PIN incorreto" (401)
- "Conta social não corresponde ao cadastro original." (403)

### Erros de Perfil e Dados (Backend)
- "Erro ao criar/atualizar usuário" (500)
- "Erro ao salvar perfil" (500)
- "Dados incompletos" (400)
- "Perfil não encontrado" (404)
- "phone_number é obrigatório" (400)
- "Registro não encontrado ou não pertence ao usuário" (404)

### Erros Amigáveis (Tratados no Frontend - `utils.js`)
Estes erros substituem falhas técnicas na interface de chat:

1.  **Cota Excedida / Rate Limit:**
    - "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns segundos!"
2.  **Erro de Autenticação / API Key:**
    - "Parece que há um problema com a minha chave de acesso (API Key). Por favor, verifique as configurações do sistema! 🔑"
3.  **Modelo Indisponível (404 do LLM):**
    - "Estou tentando usar um modelo de inteligência que parece estar indisponível ou em manutenção agora. 🛠️"
4.  **Erro de Conexão / Internet:**
    - "Hmm, não consegui me conectar ao servidor. Verifique sua internet ou tente novamente em instantes. 🌐"
5.  **Erro Genérico:**
    - "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊"

---

## 6. Observações Gerais
- **Moeda:** Todos os valores são formatados como BRL (R$).
- **Capitalização:** O sonho do usuário é automaticamente formatado para iniciar com letra minúscula após o texto "meu sonho é...", a menos que seja nome próprio (lógica simples de string).
- **Tour:** O tour guiado possui mensagens próprias explicativas sobre cada seção da tela (não listadas aqui exaustivamente, mas presentes em `components/GuidanceTour.js`).
