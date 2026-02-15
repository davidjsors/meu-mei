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

## 🏗️ 3. Arquitetura e Segurança

A estrutura do agente é composta por uma plataforma de chat multimodal com suporte a texto, áudio e imagem. O sistema utiliza um modelo de linguagem avançado com capacidade de análise contextual.

### � Autenticação e Recuperação de Conta
Para equilibrar **segurança** e **agilidade** no dia a dia do MEI, o sistema adota uma estratégia de autenticação em duas camadas:

1.  **Acesso Rápido (Dia a Dia):** O login cotidiano é realizado exclusivamente via **PIN numérico** (4 a 6 dígitos) ou **biometria** (se disponível no dispositivo), eliminando a fricção de senhas complexas.
2.  **Identidade Mestra (Recuperação):** No onboarding, é **obrigatória** a vinculação de uma conta social (**Google** ou **Gov.br**). Esta conta atua como uma "chave mestra" de segurança.
    *   *Caso o usuário esqueça o PIN:* A recuperação é feita autenticando-se novamente na conta social vinculada, permitindo a redefinição segura do PIN sem custos de envio de SMS ou e-mail.

### �📚 Base de Conhecimento (Knowledge Base)
O agente fundamenta suas respostas em uma biblioteca curada de documentos oficiais, convertidos e padronizados para garantir precisão técnica. As principais fontes incluem:

*   **Governo Federal:** Lista oficial de Ocupações Permitidas (Anexo XI), Portal do Empreendedor, FAQ MEI.
*   **Sebrae:** Guias de fluxo de caixa, diagnóstico empresarial, planejamento financeiro e gestão para MEI.
*   **Bradesco (Unibrad):** Cartilhas de educação financeira para adultos e fornecedores, manuais de tarifas bancárias (Cestas MEI/PJ), infográficos para autônomos.
*   **Banco do Nordeste:** Cadernos de gestão financeira para microempreendedores.

> **Nota:** Todas as citações fornecidas pelo agente seguem o padrão **ABNT** para garantir credibilidade e rastreabilidade da informação.

No que tange à segurança e estratégias anti-alucinação, o agente baseia suas orientações técnicas estritamente nas fontes oficiais fornecidas. A **saúde financeira** é a prioridade absoluta: recomendações de produtos ocorrem apenas como alternativa viável de organização e nunca devem incentivar o endividamento.

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
