"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./pitch.module.css";

const sections = [
    {
        id: "potencia",
        number: "01",
        label: "A Potência dos MEIs",
        color: "#9333EA",
        gradient: "linear-gradient(160deg, #0a0814 0%, #160d2e 55%, #231050 100%)",
        bgImage: "/pitch/caminhoneira.webp",
        stats: [
            { value: "12,7 milhões", label: "de negócios no Brasil" },
            { value: "52,3%", label: "das empresas ativas (2025)" },
        ],
        items: [
            { text: "Esse público é o verdadeiro motor de inclusão produtiva no país, representando a maior base de empresas em operação (53%)." },
            { text: "São responsáveis por movimentar a economia local diariamente, superando a marca de 12,7 milhões de negócios formalizados." },
            { text: "São pessoas movidas por objetivos reais e práticos, como abrir uma loja ou garantir um salário fixo no final do mês." },
        ],
        sources: [
            {
                num: 1,
                label: "BRASIL, 2025 — Mapa de Empresas",
                url: "https://www.gov.br/empresas-e-negocios/pt-br/mapa-de-empresas/boletins/mapa-de-empresas-boletim-2o-quadrimestre-2025.pdf",
            },
        ],
    },
    {
        id: "desafios",
        number: "02",
        label: "Desafios",
        color: "#D97706",
        gradient: "linear-gradient(160deg, #1a0e00 0%, #3d2400 55%, #7a4500 100%)",
        bgImage: "/pitch/mestre-obras.webp",
        stats: [
            { value: "18%", label: "bancarizados como PJ" },
            { value: "3", label: "dores críticas" },
        ],
        items: [
            { text: "As principais dores do segmento incluem a falta de estabilidade financeira, a dificuldade de acesso a crédito e o baixo apoio para empreender." },
            { text: "No dia a dia, isso se traduz na famosa confusão patrimonial: a necessidade de usar a mesma conta para as despesas de casa e da empresa." },
            { text: "Como resultado, apenas 18% mantêm algum relacionamento bancário como pessoa jurídica, o que dificulta o acesso a crédito estruturado." },
        ],
        sources: [
            {
                num: 1,
                label: "SEBRAE, 2024",
                url: "https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/3f98b7eb14543b18d4ca6a693cacaff5.pdf",
            },
            {
                num: 2,
                label: "Banco Central do Brasil, 2026",
                url: "https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries",
            },
        ],
    },
    {
        id: "oportunidades",
        number: "03",
        label: "Oportunidades",
        color: "#00D26A",
        gradient: "linear-gradient(160deg, #001a0d 0%, #003520 55%, #005c36 100%)",
        bgImage: "/pitch/costureiro.webp",
        stats: [
            { value: "+70%", label: "operam sem conta PJ" },
            { value: "IA", label: "alavanca de produtividade" },
        ],
        items: [
            { text: "Existe uma oportunidade gigantesca de inclusão e bancarização, visto que mais de 70% dos MEIs operam na informalidade bancária." },
            { text: "A verdadeira oportunidade é usar a Inteligência Artificial para automatizar a rotina do microempreendedor, permitindo que ele foque no seu objetivo." },
            { text: "Ao quebrar essa barreira, integramos a maior base de CNPJs do país ao ecossistema financeiro, destravando o acesso a crédito com segurança." },
        ],
        sources: [
            {
                num: 1,
                label: "Banco Central do Brasil, 2026",
                url: "https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries",
            },
        ],
    },
    {
        id: "meumei",
        number: "04",
        label: "Meu MEI",
        color: "#E32636",
        gradient: "linear-gradient(160deg, #1a0408 0%, #3d0910 55%, #7a1020 100%)",
        bgImage: "/pitch/mecanica.webp",
        stats: [
            { value: "Zero", label: "atrito burocrático" },
            { value: "100%", label: "foco no sonho" },
        ],
        items: [
            { text: "Ajudamos o microempreendedor a retomar o controle e voltar a focar no seu verdadeiro sonho, através de um mentor inteligente que descomplica a gestão do dinheiro." },
            { text: "Eliminamos a burocracia: o usuário envia um áudio ou foto de cupom, e nosso agente organiza tudo com segurança e fundamentado em boas práticas do mercado." },
            { text: "Atuamos de forma proativa como um copiloto que monitora o dinheiro para garantir que o objetivo do empreendedor seja atingido." },
            { text: "Nós cuidamos dos números para que eles trabalhem pelos seus sonhos." },
        ],
        sources: [],
    },
];

export default function PitchPage() {
    const [active, setActive] = useState(null);

    return (
        <main
            className={styles.root}
            onClick={() => active && setActive(null)}
        >
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <nav className={styles.pathway}>
                        {sections.map((sec, idx) => {
                            const isActive = active === sec.id;
                            return (
                                <div key={sec.id} className={styles.pathwayStep}>
                                    <button
                                        className={`${styles.pathwayBtn} ${isActive ? styles.pathwayBtnActive : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setActive(sec.id); }}
                                        style={{ "--hover-color": sec.color }}
                                    >
                                        <span className={styles.pathwayDot} />
                                        <span className={styles.pathwayLabel}>{sec.label}</span>
                                    </button>
                                    <div className={styles.pathwayLine} />
                                </div>
                            );
                        })}
                        <div className={styles.pathwayStep}>
                            <a href="/onboarding" className={styles.ctaBtn}>
                                Acessar plataforma
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroRow}>
                    <div className={styles.heroLogoWrapper}>
                        <img src="/logo2.svg" alt="Meu MEI" style={{ height: "286px", width: "auto" }} />
                    </div>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>
                            Transformando a gestão financeira de
                            <span className={styles.heroHighlight}> 12,7 milhões </span>
                            de empreendedores(as)
                        </h1>
                        <p className={styles.heroSub}>
                            Uma solução que torna a gestão financeira, antes um fardo burocrático, em motor de crescimento para o ecossistema MEI brasileiro.
                        </p>
                    </div>
                </div>
                <p className={styles.heroHint}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Clique em um painel para explorar
                </p>
            </section>

            {/* Accordion — click fora fecha */}
            <div className={styles.accordion}>
                {sections.map((sec, idx) => {
                    const isActive = active === sec.id;
                    const nextSec = sections[idx + 1] ?? null;
                    // Posicao da fatia panoramica: 0% | 33% | 66% | 100%
                    const bgPos = `${sections.length > 1 ? (idx / (sections.length - 1)) * 100 : 0}% center`;
                    return (
                        <div
                            key={sec.id}
                            className={`${styles.panel} ${isActive ? styles.panelActive : styles.panelCollapsed}`}
                            onClick={(e) => { e.stopPropagation(); !isActive && setActive(sec.id); }}
                            style={{
                                "--accent": sec.color,
                                "--gradient": sec.gradient,
                                "--bg-image": `url('${sec.bgImage}')`,
                                "--bg-pos": bgPos,
                            }}
                        >
                            {/* Background gradient */}
                            <div className={styles.panelBg} />

                            {/* ── COLLAPSED ── */}
                            <div className={styles.collapsedFace}>
                                <div className={styles.collapsedNumSmall} style={{ color: sec.color }}>
                                    {sec.number}
                                </div>
                                <div className={styles.collapsedBottom}>
                                    <span className={styles.collapsedTitle}>{sec.label}</span>
                                </div>
                                <div className={styles.collapsedPlus} style={{ color: sec.color }}>+</div>
                            </div>

                            {/* ── EXPANDED ── */}
                            <div className={styles.expandedFace}>
                                {/* Conteúdo principal */}
                                <div className={styles.expandedContent}>
                                    <h2 className={styles.expandedTitle}>{sec.label}</h2>

                                    {/* Stats pills */}
                                    <div className={styles.statsRow}>
                                        {sec.stats.map((s, i) => (
                                            <div key={i} className={styles.statItem}>
                                                <span className={styles.statValue} style={{ color: sec.color }}>{s.value}</span>
                                                <span className={styles.statLabel}>{s.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Item list */}
                                    <ul className={styles.itemList}>
                                        {sec.items.map((item, i) => (
                                            <li key={i} className={styles.listItem}>
                                                <span className={styles.bullet} style={{ color: sec.color }}>→</span>
                                                <span className={styles.itemText}>
                                                    {item.text}
                                                    {item.ref && (
                                                        <sup className={styles.refSup}>
                                                            {item.ref}
                                                        </sup>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Fontes */}
                                    {sec.sources.length > 0 && (
                                        <div className={styles.sourcesList}>
                                            {sec.sources.map((src) => (
                                                <a
                                                    key={src.num}
                                                    href={src.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.sourceLink}
                                                    style={{ color: sec.color }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {sec.sources.length > 1 ? `Ver fonte ${src.num} ↗` : "Ver fonte ↗"}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Botão de navegação: → Próximo ou Acessar plataforma */}
                                {nextSec ? (
                                    <button
                                        className={styles.nextBtn}
                                        style={{ color: sec.color, borderColor: sec.color }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActive(nextSec.id);
                                        }}
                                        aria-label={`Ir para ${nextSec.label}`}
                                    >
                                        <span className={styles.nextLabel}>{nextSec.label}</span>
                                        <span className={styles.nextArrow}>→</span>
                                    </button>
                                ) : (
                                    <a
                                        href="/onboarding"
                                        className={styles.nextBtn}
                                        style={{ color: sec.color, borderColor: sec.color, textDecoration: 'none' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span className={styles.nextLabel}>Acessar plataforma</span>
                                        <span className={styles.nextArrow}>→</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                <Image src="/logo.svg" alt="M" width={20} height={20} />
                <span className={styles.footerText}>Meu MEI: finanças em dia, dinheiro no bolso. © 2026

                </span>
            </footer>
        </main>
    );
}
