"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type MantenedorRecord = {
  id: string;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  valor_mensal?: number | null;
  created_at?: string | null;
};

type ApiGetResponse = {
  success: boolean;
  total?: number;
  somaValores?: number;
  mantenedores?: MantenedorRecord[];
  error?: string;
};

type ApiPostResponse = {
  success: boolean;
  mantenedor?: MantenedorRecord;
  error?: string;
};

const ADMIN_STORAGE_KEY = "djeone_admin_logged";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function MantenedoresAdminPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [mantenedores, setMantenedores] = useState<MantenedorRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [somaValores, setSomaValores] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Manual add modal
  const [showModal, setShowModal] = useState(false);
  const [manualNome, setManualNome] = useState("");
  const [manualWhatsapp, setManualWhatsapp] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualValor, setManualValor] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    setIsLogged(stored === "true");
  }, []);

  useEffect(() => {
    if (isLogged) {
      loadData();
    }
  }, [isLogged]);

  async function loadData() {
    setLoading(true);
    setLoadError("");

    try {
      const res = await fetch("/api/mantenedores");
      const data: ApiGetResponse = await res.json();

      if (!data.success) {
        setLoadError(data.error || "Erro ao carregar mantenedores.");
        return;
      }

      setMantenedores(data.mantenedores ?? []);
      setTotal(data.total ?? 0);
      setSomaValores(data.somaValores ?? 0);
    } catch {
      setLoadError("Erro de conexão ao carregar mantenedores.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ADMIN_PASSWORD) {
      setLoginError("Senha administrativa não configurada no ambiente.");
      return;
    }

    if (password.trim() === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, "true");
      setIsLogged(true);
      setPassword("");
      setLoginError("");
      return;
    }

    setLoginError("Senha incorreta. Tente novamente.");
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualError("");

    if (!manualNome.trim()) {
      setManualError("Nome é obrigatório.");
      return;
    }

    setManualSubmitting(true);

    try {
      const valor =
        manualValor.trim()
          ? parseFloat(manualValor.trim().replace(",", "."))
          : null;

      if (valor !== null && (isNaN(valor) || valor < 0)) {
        setManualError("Valor mensal inválido.");
        setManualSubmitting(false);
        return;
      }

      const res = await fetch("/api/mantenedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: manualNome.trim(),
          whatsapp: manualWhatsapp.trim() || null,
          email: manualEmail.trim() || null,
          valor_mensal: valor,
        }),
      });

      const data: ApiPostResponse = await res.json();

      if (!data.success) {
        setManualError(data.error || "Erro ao salvar.");
        setManualSubmitting(false);
        return;
      }

      // Reload
      await loadData();

      // Reset modal
      setShowModal(false);
      setManualNome("");
      setManualWhatsapp("");
      setManualEmail("");
      setManualValor("");
      setManualError("");
    } catch {
      setManualError("Erro de conexão.");
    } finally {
      setManualSubmitting(false);
    }
  }

  if (!isLogged) {
    return (
      <main className="admin-page">
        <section className="login-card">
          <div className="login-badge">Painel Admin</div>
          <h1>Mantenedores</h1>
          <p>Acesse para acompanhar os mantenedores cadastrados.</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="admin-password">Senha administrativa</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
            />
            {loginError && <span className="form-error">{loginError}</span>}
            <button type="submit">Entrar</button>
          </form>

          <Link href="/admin" className="back-link">
            Voltar para o painel
          </Link>
        </section>

        <style jsx>{loginStyles}</style>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Mantenedores</span>
          <h1>Acompanhamento de Mantenedores</h1>
          <p>
            Total de mantenedores cadastrados e termômetro de arrecadação
            mensal. Use o botão "Adicionar Ficha Manual" para incluir
            fichas físicas do evento.
          </p>
        </div>

        <div className="header-actions">
          <button type="button" onClick={loadData} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <Link href="/admin" className="back-link-btn">
            Painel
          </Link>
        </div>
      </header>

      {loadError && <div className="alert">{loadError}</div>}

      {/* Thermometer Section */}
      <section className="thermo-section">
        <div className="thermo-grid">
          <article className="thermo-card blue">
            <div className="thermo-icon">👥</div>
            <strong>{total}</strong>
            <h3>Total de Mantenedores</h3>
            <p>Cadastros via formulário e fichas manuais</p>
          </article>

          <article className="thermo-card gold">
            <div className="thermo-icon">💰</div>
            <strong>{formatCurrency(somaValores)}</strong>
            <h3>Arrecadação Mensal</h3>
            <p>Soma de todos os valores cadastrados</p>
          </article>

          <article className="thermo-card green">
            <div className="thermo-icon">📊</div>
            <strong>
              {total > 0 ? formatCurrency(somaValores / total) : "-"}
            </strong>
            <h3>Média por Mantenedor</h3>
            <p>Valor médio mensal por mantenedor</p>
          </article>
        </div>
      </section>

      {/* Actions */}
      <section className="actions-section">
        <button
          type="button"
          className="add-manual-btn"
          onClick={() => setShowModal(true)}
        >
          + Adicionar Ficha Manual
        </button>
      </section>

      {/* Table */}
      <section className="table-section">
        <h2>Lista de Mantenedores</h2>

        {mantenedores.length === 0 && !loading && (
          <div className="empty-state">
            <p>Nenhum mantenedor cadastrado ainda.</p>
            <p>
              Os cadastros do formulário público e fichas manuais aparecerão
              aqui.
            </p>
          </div>
        )}

        {mantenedores.length > 0 && (
          <div className="table-wrapper">
            <table className="mant-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>E-mail</th>
                  <th>Valor Mensal</th>
                  <th>Cadastrado em</th>
                </tr>
              </thead>
              <tbody>
                {mantenedores.map((m) => (
                  <tr key={m.id}>
                    <td className="name-cell">{m.nome}</td>
                    <td>{m.whatsapp || "-"}</td>
                    <td>{m.email || "-"}</td>
                    <td className="valor-cell">
                      {m.valor_mensal != null
                        ? formatCurrency(m.valor_mensal)
                        : "-"}
                    </td>
                    <td className="date-cell">
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Adicionar Ficha Manual</h2>
            <p>Preencha os dados da ficha física coletada no evento.</p>

            <form onSubmit={handleManualSubmit}>
              <label htmlFor="manual-nome">Nome *</label>
              <input
                id="manual-nome"
                type="text"
                value={manualNome}
                onChange={(e) => setManualNome(e.target.value)}
                placeholder="Nome completo"
                required
              />

              <label htmlFor="manual-whatsapp">WhatsApp</label>
              <input
                id="manual-whatsapp"
                type="text"
                value={manualWhatsapp}
                onChange={(e) => setManualWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
              />

              <label htmlFor="manual-email">E-mail</label>
              <input
                id="manual-email"
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="seu@email.com"
              />

              <label htmlFor="manual-valor">Valor Mensal</label>
              <input
                id="manual-valor"
                type="text"
                inputMode="decimal"
                value={manualValor}
                onChange={(e) => setManualValor(e.target.value)}
                placeholder="50,00"
              />

              {manualError && (
                <span className="form-error">{manualError}</span>
              )}

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setManualError("");
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={manualSubmitting}>
                  {manualSubmitting ? "Salvando..." : "Salvar Ficha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .admin-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
      radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 30rem),
      #030712;
    color: #f8fafc;
    padding: 32px 24px 56px;
  }

  .admin-header {
    max-width: 1180px;
    margin: 0 auto;
    padding-bottom: 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  .eyebrow {
    display: inline-block;
    color: #93c5fd;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    margin-bottom: 7px;
  }

  h1, h2, h3, p { margin: 0; }

  .admin-header h1 {
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 0.98;
    letter-spacing: -0.07em;
  }

  .admin-header p {
    color: #bfdbfe;
    margin-top: 12px;
    max-width: 680px;
    line-height: 1.6;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  button {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.74);
    color: #f8fafc;
    border-radius: 16px;
    padding: 12px 18px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(147, 197, 253, 0.5);
    background: rgba(30, 41, 59, 0.9);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  .back-link-btn {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.74);
    color: #bfdbfe;
    border-radius: 16px;
    padding: 12px 18px;
    font-weight: 900;
    text-decoration: none;
    font-size: 0.9rem;
    transition: background 0.2s;
  }

  .back-link-btn:hover {
    background: rgba(30, 41, 59, 0.9);
  }

  .alert {
    max-width: 1180px;
    margin: 22px auto 0;
    padding: 14px 18px;
    border-radius: 18px;
    background: rgba(127, 29, 29, 0.32);
    border: 1px solid rgba(248, 113, 113, 0.24);
    color: #fecaca;
    font-weight: 800;
  }

  /* Thermo */
  .thermo-section {
    max-width: 1180px;
    margin: 32px auto 0;
  }

  .thermo-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .thermo-card {
    min-height: 154px;
    border-radius: 26px;
    padding: 22px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.78);
  }

  .thermo-icon {
    font-size: 1.45rem;
    margin-bottom: 18px;
  }

  .thermo-card strong {
    display: block;
    font-size: 2.15rem;
    line-height: 1;
    letter-spacing: -0.06em;
    margin-bottom: 9px;
  }

  .thermo-card h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    margin-bottom: 6px;
    color: #dbeafe;
  }

  .thermo-card p {
    color: #bfdbfe;
    line-height: 1.45;
    font-size: 0.86rem;
  }

  .blue {
    background: linear-gradient(135deg, rgba(30, 64, 175, 0.26), rgba(15, 23, 42, 0.88));
    border-color: rgba(96, 165, 250, 0.24);
  }

  .gold {
    background: linear-gradient(135deg, rgba(146, 64, 14, 0.25), rgba(15, 23, 42, 0.88));
    border-color: rgba(245, 158, 11, 0.28);
  }

  .green {
    background: linear-gradient(135deg, rgba(6, 95, 70, 0.25), rgba(15, 23, 42, 0.88));
    border-color: rgba(45, 212, 191, 0.22);
  }

  /* Actions */
  .actions-section {
    max-width: 1180px;
    margin: 24px auto 0;
    display: flex;
    gap: 12px;
  }

  .add-manual-btn {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(37, 99, 235, 0.16));
    border-color: rgba(96, 165, 250, 0.32);
    font-size: 0.95rem;
  }

  /* Table */
  .table-section {
    max-width: 1180px;
    margin: 28px auto 0;
  }

  .table-section h2 {
    font-size: 1.3rem;
    letter-spacing: -0.04em;
    margin-bottom: 16px;
  }

  .empty-state {
    padding: 32px;
    text-align: center;
    border-radius: 20px;
    background: rgba(15, 23, 42, 0.58);
    border: 1px solid rgba(148, 163, 184, 0.12);
    color: #bfdbfe;
  }

  .empty-state p {
    margin-bottom: 6px;
  }

  .table-wrapper {
    border-radius: 18px;
    overflow-x: auto;
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  .mant-table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(15, 23, 42, 0.68);
    font-size: 0.9rem;
  }

  .mant-table th {
    padding: 14px 16px;
    text-align: left;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    color: #93c5fd;
    background: rgba(15, 23, 42, 0.9);
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  }

  .mant-table td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
    color: #e2e8f0;
  }

  .mant-table tr:last-child td {
    border-bottom: none;
  }

  .mant-table tr:hover td {
    background: rgba(59, 130, 246, 0.06);
  }

  .name-cell {
    font-weight: 800;
    color: #f8fafc !important;
  }

  .valor-cell {
    font-weight: 800;
    color: #facc15 !important;
  }

  .date-cell {
    color: #94a3b8 !important;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(2, 6, 23, 0.78);
    backdrop-filter: blur(6px);
    display: grid;
    place-items: center;
    padding: 16px;
  }

  .modal-card {
    width: min(100%, 460px);
    padding: 28px;
    border-radius: 24px;
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid rgba(147, 197, 253, 0.22);
    box-shadow: 0 24px 90px rgba(0, 0, 0, 0.4);
  }

  .modal-card h2 {
    font-size: 1.4rem;
    letter-spacing: -0.04em;
    margin-bottom: 6px;
  }

  .modal-card p {
    color: #bfdbfe;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .modal-card form {
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

  .form-error {
    color: #fca5a5;
    font-weight: 800;
    font-size: 0.86rem;
    background: rgba(127, 29, 29, 0.28);
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(248, 113, 113, 0.18);
  }

  .modal-buttons {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .modal-buttons button {
    flex: 1;
  }

  .cancel-btn {
    background: rgba(51, 65, 85, 0.4);
    border-color: rgba(148, 163, 184, 0.18);
    color: #bfdbfe;
  }

  @media (max-width: 768px) {
    .thermo-grid {
      grid-template-columns: 1fr;
    }

    .mant-table th:nth-child(3),
    .mant-table td:nth-child(3) {
      display: none;
    }
  }
`;

const loginStyles = `
  .admin-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
      #030712;
    color: #f8fafc;
    padding: 24px;
  }

  .login-card {
    width: min(100%, 460px);
    margin: 9vh auto 0;
    padding: 34px;
    border-radius: 32px;
    background: rgba(15, 23, 42, 0.84);
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 24px 90px rgba(0, 0, 0, 0.35);
  }

  .login-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 12px;
    background: rgba(59, 130, 246, 0.14);
    color: #93c5fd;
    font-size: 0.76rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    margin-bottom: 18px;
  }

  .login-card h1 {
    font-size: 2.4rem;
    letter-spacing: -0.07em;
    line-height: 1;
    margin: 0;
  }

  .login-card p {
    color: #bfdbfe;
    line-height: 1.65;
    margin: 14px 0 24px;
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
    border: 1px solid rgba(59, 130, 246, 0.32);
    background: rgba(37, 99, 235, 0.24);
    color: #f8fafc;
    border-radius: 16px;
    padding: 14px 20px;
    font-weight: 900;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  button:hover {
    background: rgba(37, 99, 235, 0.38);
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

  .back-link {
    display: block;
    text-align: center;
    margin-top: 20px;
    color: #93c5fd;
    font-weight: 800;
    font-size: 0.88rem;
    text-decoration: none;
  }

  .back-link:hover {
    color: #bfdbfe;
  }
`;