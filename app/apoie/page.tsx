"use client";

import { FormEvent, useEffect, useState } from "react";

type MantenedorData = {
  id: string;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  valor_mensal?: number | null;
  created_at?: string | null;
};

type ApiResponse = {
  success: boolean;
  total?: number;
  somaValores?: number;
  mantenedores?: MantenedorData[];
  error?: string;
};

const MISSION_TEXT = `Muito obrigado por dedicar um momento para conhecer o que Deus tem feito através deste projeto. Como igreja, estamos plantando novas sementes em Piracaia, e o Devocional Diário é a ferramenta digital que nos permite levar esperança e ensino bíblico diariamente a milhares de pessoas. Sua parceria não é apenas uma doação; é um investimento para que a mensagem de Cristo alcance cada vez mais vidas com excelência e constância. Ao preencher seus dados abaixo, você se torna um mantenedor desta visão. Que Deus multiplique sua generosidade e nos guie juntos nesta jornada.`;

function formatCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = parseInt(digits, 10) / 100;
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseCurrency(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export default function ApoiePage() {
  const [totalMantenedores, setTotalMantenedores] = useState(0);
  const [counterLoading, setCounterLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadCounter() {
      try {
        const res = await fetch("/api/mantenedores");
        const data: ApiResponse = await res.json();
        if (data.success && typeof data.total === "number") {
          setTotalMantenedores(data.total);
        }
      } catch {
        // Silent fail for counter
      } finally {
        setCounterLoading(false);
      }
    }
    loadCounter();
  }, []);

  function handleWhatsappChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) {
      setWhatsapp(digits);
    } else if (digits.length <= 7) {
      setWhatsapp(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setWhatsapp(
        `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
      );
    }
  }

  function handleValorChange(value: string) {
    setValorMensal(formatCurrency(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError("");

    if (!nome.trim()) {
      setApiError("Por favor, informe seu nome.");
      return;
    }

    setSubmitting(true);

    try {
      const valor = parseCurrency(valorMensal);
      const res = await fetch("/api/mantenedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp || null,
          email: email || null,
          valor_mensal: valor || null,
        }),
      });

      const data: ApiResponse = await res.json();

      if (!data.success) {
        setApiError(data.error || "Erro ao enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setTotalMantenedores((prev) => prev + 1);
    } catch {
      setApiError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="apoie-page">
        <div className="success-card">
          <div className="success-icon">🙏</div>
          <h1>Muito obrigado!</h1>
          <p>
            Sua generosidade foi registrada com carinho. Que Deus retribua em
            dobro tudo o que você semeou hoje. Juntos, estamos levando a Palavra
            de Deus a milhares de corações. Conte conosco em oração!
          </p>
          <button
            type="button"
            className="back-button"
            onClick={() => {
              setSubmitted(false);
              setNome("");
              setWhatsapp("");
              setEmail("");
              setValorMensal("");
            }}
          >
            Quero cadastrar outra pessoa
          </button>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="apoie-page">
      <header className="hero">
        <span className="eyebrow">Seja um Mantenedor</span>
        <h1>Plante sementes para o Reino</h1>
      </header>

      {/* Social Proof Counter */}
      <section className="counter-section">
        <div className="counter-badge">
          {counterLoading ? (
            <span className="counter-loading">Carregando...</span>
          ) : (
            <>
              <span className="counter-number">{totalMantenedores}</span>
              <span className="counter-label">
                {totalMantenedores === 1
                  ? "mantenedor nesta missão!"
                  : "mantenedores nesta missão!"}
              </span>
            </>
          )}
        </div>
        <p className="counter-prefix">
          {totalMantenedores > 0 ? "Já somos" : "Seja o primeiro mantenedor!"}
        </p>
      </section>

      {/* Mission Text */}
      <section className="mission-section">
        <p className="mission-text">{MISSION_TEXT}</p>
      </section>

      {/* Form */}
      <section className="form-section">
        <h2>Preencha seus dados</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nome">Nome *</label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome completo"
            required
            autoComplete="name"
          />

          <label htmlFor="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => handleWhatsappChange(e.target.value)}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
          />

          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
          />

          <label htmlFor="valor">Valor Mensal</label>
          <input
            id="valor"
            type="text"
            inputMode="decimal"
            value={valorMensal}
            onChange={(e) => handleValorChange(e.target.value)}
            placeholder="R$ 0,00"
          />

          {apiError && <span className="form-error">{apiError}</span>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Quero ser um mantenedor! 🙌"}
          </button>
        </form>
      </section>

      <footer className="page-footer">
        <p>Deus abençoe sua vida generosa!</p>
        <p className="verse">
          "Cada um contribua segundo propôs no seu coração, não com
          tristeza ou por necessidade; porque Deus ama ao que dá com
          alegria."
          <br />
          <em>2 Coríntios 9:7</em>
        </p>
      </footer>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .apoie-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 36rem),
      radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.10), transparent 30rem),
      #030712;
    color: #f8fafc;
    padding: 24px 16px 56px;
  }

  .hero {
    text-align: center;
    padding: 20px 0 12px;
  }

  .eyebrow {
    display: inline-block;
    color: #93c5fd;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    margin-bottom: 8px;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: -0.06em;
    line-height: 1.05;
    margin: 0;
  }

  h2 {
    font-size: 1.25rem;
    letter-spacing: -0.04em;
    margin: 0 0 16px;
    color: #dbeafe;
  }

  /* Counter */
  .counter-section {
    text-align: center;
    padding: 20px 0 8px;
  }

  .counter-prefix {
    color: #bfdbfe;
    font-size: 1rem;
    margin: 0 0 4px;
  }

  .counter-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(168, 85, 247, 0.12));
    border: 1px solid rgba(147, 197, 253, 0.28);
    border-radius: 20px;
    padding: 14px 24px;
    margin-bottom: 4px;
  }

  .counter-number {
    font-size: 2.4rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    color: #facc15;
    line-height: 1;
  }

  .counter-label {
    color: #bfdbfe;
    font-size: 1rem;
    font-weight: 800;
  }

  .counter-loading {
    color: #93c5fd;
    font-size: 0.9rem;
  }

  /* Mission */
  .mission-section {
    max-width: 640px;
    margin: 20px auto;
    padding: 20px;
    border-radius: 20px;
    background: rgba(15, 23, 42, 0.62);
    border: 1px solid rgba(148, 163, 184, 0.12);
  }

  .mission-text {
    color: #e2e8f0;
    line-height: 1.75;
    font-size: 0.95rem;
    margin: 0;
    text-align: justify;
  }

  /* Form */
  .form-section {
    max-width: 500px;
    margin: 28px auto;
    padding: 24px;
    border-radius: 24px;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.16);
  }

  form {
    display: grid;
    gap: 12px;
  }

  label {
    color: #dbeafe;
    font-weight: 900;
    font-size: 0.86rem;
  }

  input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(2, 6, 23, 0.58);
    color: #f8fafc;
    border-radius: 14px;
    padding: 12px 16px;
    font-size: 0.95rem;
    transition: border-color 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.55);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  input::placeholder {
    color: #64748b;
  }

  button {
    border: 1px solid rgba(245, 158, 11, 0.32);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.18));
    color: #f8fafc;
    border-radius: 16px;
    padding: 14px 20px;
    font-weight: 900;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    margin-top: 8px;
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(250, 204, 21, 0.5);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.30), rgba(217, 119, 6, 0.24));
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  .form-error {
    color: #fca5a5;
    font-weight: 800;
    font-size: 0.86rem;
    background: rgba(127, 29, 29, 0.28);
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(248, 113, 113, 0.18);
  }

  .page-footer {
    text-align: center;
    padding: 32px 16px 16px;
    max-width: 500px;
    margin: 0 auto;
  }

  .page-footer p {
    color: #bfdbfe;
    font-size: 0.92rem;
    margin: 0 0 10px;
  }

  .verse {
    color: #94a3b8 !important;
    font-size: 0.82rem !important;
    line-height: 1.7;
  }

  /* Success */
  .success-card {
    max-width: 520px;
    margin: 10vh auto 0;
    padding: 36px 28px;
    border-radius: 28px;
    background: rgba(15, 23, 42, 0.84);
    border: 1px solid rgba(147, 197, 253, 0.22);
    text-align: center;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  }

  .success-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
  }

  .success-card h1 {
    font-size: 2.2rem;
    margin-bottom: 16px;
    letter-spacing: -0.06em;
  }

  .success-card p {
    color: #bfdbfe;
    line-height: 1.75;
    margin-bottom: 24px;
  }

  .back-button {
    display: inline-block;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(96, 165, 250, 0.28);
    color: #dbeafe;
    border-radius: 14px;
    padding: 12px 20px;
    font-weight: 900;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .back-button:hover {
    background: rgba(59, 130, 246, 0.24);
  }

  @media (min-width: 640px) {
    .apoie-page {
      padding: 40px 32px 72px;
    }
  }
`;