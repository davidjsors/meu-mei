import "../styles/globals.css";

export const metadata = {
    title: "Meu MEI - Seu Mentor Financeiro 24/7",
    description:
        "Assessoria financeira 24/7 com IA para microempreendedores individuais. Finanças em dia, dinheiro no bolso.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <meta name="theme-color" content="#111B21" />
                <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>" />
            </head>
            <body>{children}</body>
        </html>
    );
}
