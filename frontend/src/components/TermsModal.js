"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * TermsModal — Modal de aceite dos Termos de Uso e Política de Privacidade.
 */
export default function TermsModal({ onAccept }) {
    const [accepted, setAccepted] = useState(false);
    const router = useRouter();

    return (
        <div className="terms-overlay">
            <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="terms-header">
                    <h1>📜 Termos de Uso e Política de Privacidade</h1>
                </div>

                {/* Scrollable content */}
                <div className="terms-body">
                    <p>
                        Bem-vindo ao <strong>Meu MEI</strong>. Ao utilizar nossa plataforma,
                        você confia a nós a gestão de dados importantes para o seu crescimento.
                        Este documento explica como protegemos seus dados, quais são seus
                        direitos e as regras para o uso da nossa tecnologia de mentoria financeira.
                    </p>

                    <h2>1. Termos de Uso (Regras de Convivência)</h2>

                    <h3>1.1. Objeto e Aceite</h3>
                    <p>
                        O Meu MEI é uma ferramenta de auxílio à gestão financeira e educação
                        para Microempreendedores Individuais. Ao clicar em &quot;Aceito os Termos&quot;,
                        você declara ter lido e concordado com estas regras.
                    </p>

                    <h3>1.2. Elegibilidade e Cadastro</h3>
                    <p>
                        A plataforma é destinada exclusivamente a MEIs devidamente registrados
                        no território brasileiro. O usuário é responsável pela veracidade dos
                        dados inseridos (CNPJ, faturamento, despesas).
                    </p>

                    <h3>1.3. Limitações da Inteligência Artificial</h3>
                    <p>O Meu MEI atua como um mentor educativo. Você declara estar ciente de que:</p>
                    <ul>
                        <li>As recomendações da IA são baseadas em dados inseridos por você e em modelos estatísticos.</li>
                        <li>O agente não substitui o aconselhamento profissional de um contador ou advogado.</li>
                        <li>O sistema não realiza transações bancárias nem investimentos em seu nome.</li>
                    </ul>

                    <h3>1.4. Uso Proibido</h3>
                    <p>
                        É terminantemente proibido utilizar a plataforma para registrar atividades
                        ilícitas, sonegação fiscal ou práticas que configurem lavagem de dinheiro ou fraude.
                    </p>

                    <h2>2. Política de Privacidade (LGPD)</h2>

                    <h3>2.1. Quais dados coletamos?</h3>
                    <ul>
                        <li><strong>Dados Cadastrais:</strong> Nome, e-mail, CPF e CNPJ.</li>
                        <li><strong>Dados Financeiros:</strong> Registros de entradas, saídas, boletos e fluxo de caixa.</li>
                        <li><strong>Dados Multimodais:</strong> Áudios enviados para registro de voz e imagens/PDFs de recibos.</li>
                        <li><strong>Dados de Diagnóstico:</strong> Respostas ao instrumento IAMF-MEI.</li>
                    </ul>

                    <h3>2.2. Para que usamos seus dados?</h3>
                    <p>
                        As finalidades incluem a personalização da linguagem conforme sua maturidade
                        financeira, processamento automatizado de recibos e análise de progresso rumo
                        ao seu &quot;Caminho para o Sonho&quot;.
                    </p>

                    <h3>2.3. Compartilhamento de Dados</h3>
                    <p>
                        Seus dados financeiros não são vendidos. Compartilhamos apenas com parceiros
                        essenciais (Google Cloud/Vertex AI) ou com o ecossistema Bradesco mediante
                        sua autorização prévia.
                    </p>

                    <h2>3. Segurança da Informação</h2>
                    <p>
                        Adotamos criptografia rigorosa em trânsito e em repouso, isolamento de domínio
                        e monitoramento constante de logs para garantir a integridade do sistema.
                    </p>

                    <h2>4. Atualizações</h2>
                    <p>
                        Este documento pode ser atualizado para refletir melhorias técnicas.
                        Notificaremos você sobre alterações importantes.
                    </p>
                </div>

                {/* Acceptance box */}
                <div className="terms-acceptance">
                    <label className="terms-checkbox-wrapper">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <span>
                            Li e compreendo que o <strong>Meu MEI</strong> processará meus áudios
                            e imagens para fins de gestão financeira. Autorizo o tratamento dos
                            meus dados conforme a LGPD.
                        </span>
                    </label>
                    <div className="terms-btn-group">
                        <button
                            className="terms-submit-btn"
                            disabled={!accepted}
                            onClick={onAccept}
                        >
                            ACEITAR E PROSSEGUIR
                        </button>
                        <button className="terms-exit-btn" onClick={() => router.push("/")}>
                            SAIR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
