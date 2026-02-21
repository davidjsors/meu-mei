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
- **Botão:** "Continuar →" (Carregando: "Validando...")
- **Nota de rodapé:** "Sua conta é vinculada ao seu número."
- **Erros:**
  - "Por favor, informe seu celular completo com DDD."

### Etapa 2: Perfil e Criação de Senha
- **Título:** "Bem-vindo(a) ao Meu MEI!"
- **Subtítulo:** "Conte um pouco sobre você e o seu negócio, e defina sua senha de acesso."
- **Campos:**
  - **Nome:** Label "Nome", Placeholder "Seu nome"
  - **Profissão:** Label "Profissão", Placeholder "Ex: Eletricista..."
  - **Sonho:** Label "Qual o seu maior sonho relacionado ao seu negócio?", Placeholder "Ex: Abrir minha loja física ou vender 10 mil por mês"
- **Criação de PIN:**
  - **Aviso:** "Atenção: Guarde bem este número! Ele será sua senha para entrar no Meu MEI sempre que precisar."
  - **Input:** Placeholder "PIN (6 números)"
  - **Confirmação:** Placeholder "Confirme o PIN"
- **Botão:** "Tudo pronto! Vamos continuar →" (Carregando: "Salvando...")
- **Erros:**
  - "Opa! Como podemos te chamar? Informe seu nome."
  - "Qual a sua profissão? (ex: Eletricista)"
  - "Conte para a gente qual o seu maior sonho!"
  - "Crie um PIN de exatamente 6 números."
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
- **Subtítulo:** "Para te ajudar a focar no que importa, qual o valor de faturamento (vendas) você deseja atingir todo mês?"
- **Label:** "1. Meta mensal de vendas"
- **Placeholder:** "0,00"
- **Botão:** "Continuar →"
- **Erro:** "Informe sua meta de vendas mensal."

### Etapa 6: Saldo Inicial
- **Título:** "Seu Ponto de Partida"
- **Subtítulo:** "Para começar com o pé direito, quanto você tem hoje em caixa para o seu negócio? (Este valor será seu saldo inicial no Meu MEI)"
- **Label:** "Caixa Atual (Dinheiro em mãos + Banco)"
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

## 2. Sidebar e Navegação
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

## 3. Interface de Chat
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

## 4. Erros e Respostas de API (Backend & Utils)
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
    - "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns minutos!"
2.  **Erro de Autenticação / API Key:**
    - "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns minutos!"
3.  **Modelo Indisponível (404 do LLM):**
    - "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns minutos!"
4.  **Erro de Conexão / Internet:**
    - "Hmm, não consegui me conectar a sua conta. Verifique sua internet ou tente novamente em instantes. 🌐"
5.  **Erro Genérico:**
    - "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊"

---

## 5. Página de Pitch (Apresentação Inicial)
**Arquivo:** `frontend/src/app/pitch/page.js`

### Cabeçalho & Hero
- **Pathway Navegação:** "A Potência dos MEIs", "Desafios", "Oportunidades", "Meu MEI"
- **Botão Principal:** "Acessar plataforma"
- **Título Hero:** "Transformando a gestão financeira de 12,7 milhões de empreendedores(as)"
- **Subtítulo Hero:** "Uma solução que torna a gestão financeira, antes um fardo burocrático, em motor de crescimento para o ecossistema MEI brasileiro."
- **Dica Interativa:** "Clique em um painel para explorar"

### Painel 1: A Potência dos MEIs
- **Estatísticas:** "+50% das empresas ativas no Brasil", "12,7M negócios em operação"
- **Itens:**
  - "O segmento já representa mais de 50% do total de empresas ativas no Brasil." (Fonte: BRASIL, 2025 — Mapa de Empresas)
  - "São mais de 12,7 milhões de negócios em operação."
  - "Na média, possuem 40,8 anos."
  - "45,3% de mulheres."
  - "54,7% de homens."

### Painel 2: Desafios
- **Estatísticas:** "18% bancarizados como PJ", "3 dores críticas"
- **Itens:**
  - "As principais dores do segmento incluem: a falta de estabilidade financeira, a dificuldade de acesso a crédito e o baixo apoio para empreender." (Fonte: SEBRAE, 2024)
  - "Apenas 2 milhões (18%), dos mais de 14,6 milhões de MEIs, possuíam relacionamento bancário na pessoa jurídica, em 2022." (Fonte: Banco Central do Brasil, 2026)
  - "Indicando que esse segmento não é bancarizado ou utiliza contas de pessoa física para transacionar seus negócios, o que dificulta a construção de um histórico de crédito e a separação patrimonial."

### Painel 3: Oportunidades
- **Estatísticas:** "50K MEIs na plataforma Bradesco", "90% permaneceram ativos"
- **Itens:**
  - "IA: elevar a produtividade por meio da automação de rotinas administrativas, permitindo que o empreendedor foque em sua atividade-fim."
  - "Nova plataforma digital do Bradesco: adesão de 50 mil clientes MEI e 90% deles permaneceram ativos." (Fonte: BRADESCO, 2025 — Relatório de Resultados)
  - "Demanda reprimida e uma necessidade latente por digitalização e acesso a ferramentas tecnológicas."

### Painel 4: Meu MEI
- **Estatísticas:** "24/7 copiloto disponível", "∞ de qualquer aparelho"
- **Itens:**
  - "Organiza toda a vida financeira do negócio, permitindo ver o lucro real e a saúde do dinheiro constantemente."
  - "Reduz a ansiedade sobre o futuro financeiro e a sensação de estar trabalhando apenas para pagar boleto."
  - "Profissionaliza a gestão para facilitar o acesso a crédito e o relacionamento com agentes do sistema financeiro nacional."
  - "Alerta sobre as dificuldades que poderão surgir no futuro e sugere ações práticas para manter as contas no azul."
  - "Orientado a um objetivo real: o agente monitora a distância entre o status atual e esse objetivo, agindo como um copiloto que comemora vitórias e sugere ajustes de rota."
  - "Liberdade de gerenciar seu negócio de qualquer lugar e em qualquer aparelho."
  - "Conexão com o ecossistema Bradesco, indicando possíveis produtos e serviços para cada momento da jornada."

### Elementos do Acordeão e Rodapé
- **Links de Fonte:** "Ver fonte ↗" ou "Ver fonte [X] ↗" (dependendo do número de fontes).
- **Botões do Acordeão:** Etiqueta para próximo painel ou "✕" para fechar.
- **Rodapé:** "Meu MEI: finanças em dia, dinheiro no bolso. © 2026"

---

## 6. Tour Guiado (Onboarding na Plataforma)
**Arquivo:** `frontend/src/components/GuidanceTour.js`

### Tour Desktop (Telas Grandes)
- **Passo 1:**
  - **Título:** "Bem-vindo ao Meu MEI! 👋"
  - **Conteúdo:** "Parabéns por dar esse passo! Eu sou seu mentor e vou te ajudar a organizar suas finanças de um jeito simples e rápido. Vamos conhecer as ferramentas?"
- **Passo 2:**
  - **Título:** "Seu Resumo Financeiro"
  - **Conteúdo:** "Aqui você acompanha o que entra e o que sai em tempo real. Toque nos valores para ver o histórico detalhado do mês!"
- **Passo 3:**
  - **Título:** "Sua Meta de Vendas"
  - **Conteúdo:** "Defina quanto você quer faturar este mês. O gráfico mostra o quanto você já caminhou para realizar seus sonhos!"
- **Passo 4:**
  - **Título:** "Registros Rápidos"
  - **Conteúdo:** "Vendeu algo ou teve um gasto? Use estes botões para registrar em segundos sem precisar digitar."
- **Passo 5:**
  - **Título:** "Fale Comigo!"
  - **Conteúdo:** "Você pode me enviar mensagens, áudios ou até fotos de comprovantes. Eu entendo tudo e organizo para você!"
- **Passo 6:**
  - **Título:** "Lembre-se do seu Sonho"
  - **Conteúdo:** "Sempre que precisar de um incentivo, olhe aqui. Estou aqui para garantir que você chegue lá!"
- **Botões (Desktop):** "Anterior", "Próximo", "Começar Agora!" (último passo).

### Tour Mobile (Telas Pequenas)
- **Passo 1:**
  - **Título:** "👋 Bem-vindo ao Meu MEI!"
  - **Conteúdo:** "Sou seu mentor financeiro. Vou te ajudar a organizar as finanças do seu negócio de um jeito simples. Vamos dar uma olhada rápida?"
- **Passo 2:**
  - **Título:** "💬 Converse Comigo"
  - **Conteúdo:** "Esta é a tela principal. Você pode me mandar mensagens de texto, áudios ou até fotos de comprovantes. Eu entendo tudo!"
  - **Aviso visual:** "Use o campo de texto abaixo para começar a conversar"
- **Passo 3:**
  - **Título:** "☰ Seu Painel Financeiro"
  - **Conteúdo:** "Toque no ícone de menu (☰) no canto superior esquerdo para ver seu saldo, metas e registrar entradas e saídas rapidinho."
  - **Aviso visual:** "Procure o ícone ☰ no canto superior esquerdo da tela"
- **Passo 4:**
  - **Título:** "💰 Saldo e Metas"
  - **Conteúdo:** "No painel lateral você acompanha quanto entrou, quanto saiu e o progresso da sua meta mensal em tempo real."
- **Passo 5:**
  - **Título:** "⚡ Registros em 1 Toque"
  - **Conteúdo:** "No painel lateral há botões rápidos para registrar uma venda ou gasto. Rápido e fácil!"
- **Passo 6:**
  - **Título:** "🚀 Tudo Pronto!"
  - **Conteúdo:** "Agora você já sabe tudo. Comece me contando como foi seu dia no negócio, ou registre sua primeira transação!"
- **Botões (Mobile):** "Anterior" (ícone), "Próximo", "Vamos lá! 🚀" (último passo).

---

## 7. Observações Gerais
- **Moeda:** Todos os valores são formatados como BRL (R$).
- **Capitalização:** O sonho do usuário é automaticamente formatado para iniciar com letra minúscula após o texto "meu sonho é...", a menos que seja nome próprio (lógica simples de string).
