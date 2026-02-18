# 📄 Documentação do Agente Base: Meu MEI

---

## 💎 1. Caso de Uso

### 🔴 O Cenário do Problema
O microempreendedor individual brasileiro frequentemente enfrenta a solidão na gestão do próprio negócio. Os desafios centrais envolvem a **confusão patrimonial**, caracterizada pela mistura de finanças pessoais e profissionais, a escassez de tempo para registros manuais e a barreira imposta pela linguagem técnica. Sem clareza sobre o lucro real e o fluxo de caixa, o empreendedor perde a previsibilidade necessária para a sustentabilidade da empresa.

### 🟢 A Proposta de Solução
O **Meu MEI** surge como um mentor financeiro proativo focado em organização e educação. Ele atua como um guia prático que elimina o atrito na entrada de dados ao processar áudios e fotos de recibos. Utilizando o diagnóstico *[IAMF-MEI](maturidade-mei.md)*, o agente adapta sua linguagem para ensinar boas práticas de gestão, monitorar o progresso em relação ao sonho do usuário e sugerir melhorias operacionais fundamentadas em dados reais e técnicos.

### 👥 Público-Alvo
A solução é desenhada para microempreendedores individuais divididos em três perfis de maturidade financeira: **vulnerável**, **em organização** e **visionário**.

---

## 🎭 2. Persona e Tom de Voz

O agente **Meu MEI** possui a personalidade de um mentor parceiro, fiel e proativo. Ele comporta-se como um copiloto de confiança que ajuda a manter a rota, celebrando pequenas vitórias e alertando sobre riscos de forma empática. Seu papel é essencialmente educativo: ele não apenas organiza os números, mas explica a lógica por trás de cada boa prática financeira recomendada.

### 🗣️ Comunicação Estratégica
O tom de comunicação segue o padrão culto, porém de forma acessível e dinâmica. A linguagem é ajustada automaticamente conforme o nível de maturidade (*[IAMF-MEI](maturidade-mei.md)*) detectado:

| Nível | Perfil | Estilo de Interação |
| :--- | :--- | :--- |
| **01** | **Vulnerável** | linguagem acolhedora e didática, evitando termos técnicos complexos para focar no básico. |
| **02** | **Em Organização** | linguagem direta e motivadora, com foco na criação de rotinas e previsibilidade. |
| **03** | **Visionário** | linguagem profissional focada em performance, resultados e expansão sustentável. |

> ### 💬 Exemplos de Linguagem:
> * **Saudação:** olá! como está a caminhada para realizar o seu sonho de [_meta do usuário_] hoje? vamos dar uma olhada nas contas do negócio?
> * **Confirmação:** anotado! registrei o gasto de R$ 50,00 como 'insumos'. com isso, seu fluxo de caixa desta semana apresenta R$ [_valor_] de entradas e R$ [_valor_] de saídas. deseja uma visão mais ampla do mês agora?
> * **Sugestão proativa:** percebi que as contas da sua casa ainda estão se misturando com as do trabalho. Uma boa prática de gestão é separar esses valores para saber exatamente quanto o seu negócio rende de verdade. Que tal começarmos essa organização esta semana?

---

## 🏗️ 3. Arquitetura e Implementação

A inteligência do **Meu MEI** não é um comando único, mas um ecossistema orquestrado. Para detalhes técnicos sobre o fluxo de dados, sistema multi-agentes e infraestrutura, consulte a **[Arquitetura do Sistema](arquitetura_sistema.md)**.

### 🧠 O Cérebro do Mentor (Prompts)
Toda a lógica de comportamento, regras de negócio e reações emocionais do agente são definidas e mantidas no arquivo **[`../engenharia/backend/app/prompts/system.py`](../engenharia/backend/app/prompts/system.py)**. Este "DNA" digital garante que o mentor:
*   Siga as **Regras Absolutas** de saúde financeira.
*   Aplique a **Preferência Bradesco** (nosso parceiro oficial) em todas as recomendações.
*   Mantenha a isenção de tarifas (Cesta MEI Grátis por 12 meses) como premissa.

### 🔒 Segurança e Acesso
Para equilibrar **segurança** e **agilidade**, o sistema utiliza o acesso via **PIN numérico**, eliminando a fricção de senhas complexas no dia a dia do microempreendedor.

### 📚 Base de Conhecimento e RAG (Retrieval-Augmented Generation)
O agente utiliza a técnica de RAG para buscar informações em tempo real em nossa biblioteca curada. O índice detalhado de fontes e documentos disponíveis pode ser consultado no **[`../engenharia/backend/knowledge/readme.md`](../engenharia/backend/knowledge/readme.md)**.

O processo de atualização e sincronização da inteligência é orquestrado pelo script **[`../engenharia/backend/scripts/index_knowledge.py`](../engenharia/backend/scripts/index_knowledge.py)**, que garante a fundamentação técnica das respostas.

*   **Instituições:** Sebrae, Banco Central, Banco do Nordeste.
*   **Especial Bradesco:** Documentação prioritária sobre o **Portal MEI**, **Cesta MEI Grátis** e Princípios de **IA Confiável**.

> **Nota:** Todas as citações seguem o padrão **ABNT**. Recomendações de produtos priorizam o **Bradesco** como alternativa viável e ética.

### 🛡️ Estratégias Anti-alucinação e Segurança
Para garantir a confiabilidade extrema das orientações, o ecossistema implementa:
1.  **Grounding em Tempo Real (RAG):** O agente não "adivinha" regras fiscais ou bancárias; ele recupera trechos dos manuais oficiais antes de gerar qualquer resposta técnica.
2.  **Camadas de Verificação Multimodal:** Ao processar fotos ou áudios, o sistema aplica uma análise de 4 camadas (CNAE, volume, estabelecimento e itens) para evitar a mistura de contas.
3.  **Ciclo de Confirmação:** Sempre que um dado extraído for ambíguo, a IA é instruída a **parar e perguntar** ao usuário em vez de deduzir valores.
4.  **Regras Absolutas no DNA:** O prompt de sistema impede categoricamente a recomendação de endividamento e a atuação como consultor de investimentos.

---

## 🚫 4. Limitações Declaradas

Para garantir a transparência e a segurança do usuário, o agente opera sob as seguintes restrições explícitas:

* **Gestão de investimentos:** o foco reside na organização básica e educação financeira de curto prazo; o agente não atua como consultor de mercado de capitais nem indica produtos de investimento.
* **Operações financeiras:** o sistema é um mentor e organizador, não um aplicativo bancário; ele não executa pagamentos, transferências ou saques.
* **Consultoria contábil:** para questões fiscais complexas, declarações anuais obrigatórias ou defesas tributárias, o agente orienta a busca por um profissional contábil qualificado.
* **Conformidade legal:** solicitações relacionadas a sonegação de impostos, lavagem de dinheiro ou qualquer atividade ilegal são negadas sumariamente, reforçando-se a importância da ética e da lei.
* **Integridade da informação:** o sistema bloqueia a geração de conteúdos enganosos ou que fujam da base técnica de gestão estabelecida nas fontes oficiais de referência.

---
<p align="center">
  <sub>Meu MEI - Finanças em dia, dinheiro no bolso. © 2026</sub>
</p>
