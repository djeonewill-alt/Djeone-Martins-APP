"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FilterValue = string | number | boolean;

type CountResponse = {
  count: number | null;
  error: {
    message?: string;
  } | null;
};

type CountQuery = {
  eq: (column: string, value: FilterValue) => CountQuery;
  gte: (column: string, value: string) => CountQuery;
  then: PromiseLike<CountResponse>["then"];
};

type AdminStats = {
  series: number;
  episodes: number;
  scheduledEpisodes: number;
  dailyQuotes: number;
  publicPrayers: number;
  privatePrayers: number;
  answeredPrayers: number;
  prayerInteractions: number;
  prayerEncouragements: number;
  favorites: number;
  notifications: number;
  users: number;
  readingProgress: number;
};

type ActionCard = {
  title: string;
  description: string;
  href: string;
  icon: string;
  tone: "blue" | "gold" | "green" | "purple" | "rose" | "stone";
};

type MetricCard = {
  title: string;
  value: number | string;
  description: string;
  icon: string;
  tone: "blue" | "gold" | "green" | "purple" | "rose" | "stone";
};

const ADMIN_STORAGE_KEY = "djeone_admin_logged";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin-dev";

const supabase: SupabaseClient | null = createSupabaseBrowserClient() as SupabaseClient;

const initialStats: AdminStats = {
  series: 0,
  episodes: 0,
  scheduledEpisodes: 0,
  dailyQuotes: 0,
  publicPrayers: 0,
  privatePrayers: 0,
  answeredPrayers: 0,
  prayerInteractions: 0,
  prayerEncouragements: 0,
  favorites: 0,
  notifications: 0,
  users: 0,
  readingProgress: 0,
};

async function safeCount(
  tableName: string,
  filter?: (query: CountQuery) => CountQuery
): Promise<number> {
  if (!supabase) return 0;

  try {
    let query = supabase
      .from(tableName)
      .select("*", { count: "exact", head: true }) as unknown as CountQuery;

    if (filter) {
      query = filter(query);
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

function formatNumber(value: number | string) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function AdminDashboardPage() {
  const [isLogged, setIsLogged] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [showInternalData, setShowInternalData] = useState(false);

  const todayLabel = useMemo(() => getTodayLabel(), []);

  async function loadStats() {
    setLoading(true);
    setLoadError("");

    try {
      const nowIso = new Date().toISOString();

      const [
        series,
        episodes,
        scheduledByPublishedAt,
        scheduledByScheduledAt,
        dailyQuotes,
        publicPrayers,
        privatePrayers,
        answeredByStatus,
        answeredByBoolean,
        prayerInteractions,
        prayerEncouragements,
        favorites,
        notifications,
        usersFromProfiles,
        usersFromDevices,
        readingProgress,
      ] = await Promise.all([
        safeCount("series"),
        safeCount("episodes"),
        safeCount("episodes", (query) => query.gte("published_at", nowIso)),
        safeCount("episodes", (query) => query.gte("scheduled_at", nowIso)),
        safeCount("daily_quotes"),
        safeCount("prayer_requests", (query) => query.eq("is_public", true)),
        safeCount("prayer_requests", (query) => query.eq("is_public", false)),
        safeCount("prayer_requests", (query) => query.eq("status", "answered")),
        safeCount("prayer_requests", (query) => query.eq("is_answered", true)),
        safeCount("prayer_interactions"),
        safeCount("prayer_encouragements"),
        safeCount("favorites"),
        safeCount("notifications"),
        safeCount("profiles"),
        safeCount("device_profiles"),
        safeCount("reading_progress"),
      ]);

      setStats({
        series,
        episodes,
        scheduledEpisodes: Math.max(scheduledByPublishedAt, scheduledByScheduledAt),
        dailyQuotes,
        publicPrayers,
        privatePrayers,
        answeredPrayers: Math.max(answeredByStatus, answeredByBoolean),
        prayerInteractions,
        prayerEncouragements,
        favorites,
        notifications,
        users: Math.max(usersFromProfiles, usersFromDevices),
        readingProgress,
      });

      setLastUpdated(
        new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    } catch {
      setLoadError("Não foi possível carregar os dados do painel agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsLogged(true);
  }, []);

  useEffect(() => {
    if (isLogged) {
      loadStats();
    }
  }, [isLogged]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.trim() === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, "true");
      setIsLogged(true);
      setPassword("");
      setLoginError("");
      return;
    }

    setLoginError("Senha incorreta. Tente novamente.");
  }

  async function handleLogout() {
    const supabaseAuth = createSupabaseBrowserClient();
    await supabaseAuth.auth.signOut();
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.location.href = "/cadastro";
  }

  const totalPrayers = stats.publicPrayers + stats.privatePrayers;
  const totalPastoralEngagement =
    stats.prayerInteractions + stats.prayerEncouragements + stats.favorites;
  const retentionSignals =
    stats.favorites + stats.prayerInteractions + stats.readingProgress;

  const actionCards: ActionCard[] = [
    {
      title: "Novo episódio",
      description: "Gravar, transcrever, gerar Palavra do Dia e publicar.",
      href: "/admin/novo-episodio",
      icon: "🎙️",
      tone: "blue",
    },
    {
      title: "Podcasts",
      description: "Organizar podcasts, capas, episódios, destaque e ordem de exibição.",
      href: "/admin/series",
      icon: "🗂️",
      tone: "gold",
    },
    {
      title: "Orações",
      description: "Acompanhar pedidos públicos, privados e respondidos.",
      href: "/admin/oracoes",
      icon: "🙏",
      tone: "rose",
    },
    {
      title: "Ver app",
      description: "Abrir a experiência pública do aplicativo.",
      href: "/",
      icon: "📱",
      tone: "stone",
    },
  ];

  const growthMetrics: MetricCard[] = [
    {
      title: "Usuários identificados",
      value: stats.users || "em breve",
      description:
        stats.users > 0
          ? "registros encontrados no banco"
          : "será ativado quando houver tabela de perfis/dispositivos",
      icon: "👥",
      tone: "blue",
    },
    {
      title: "Conteúdos disponíveis",
      value: stats.episodes + stats.series,
      description: "podcasts e episódios disponíveis no app",
      icon: "📈",
      tone: "green",
    },
    {
      title: "Orações registradas",
      value: totalPrayers,
      description: "pedidos enviados pela comunidade",
      icon: "🙏",
      tone: "rose",
    },
    {
      title: "Engajamento pastoral",
      value: totalPastoralEngagement,
      description: "favoritos, encorajamentos e cliques em Eu orei",
      icon: "🔥",
      tone: "gold",
    },
    {
      title: "Sinais de retenção",
      value: retentionSignals,
      description: "ações que indicam retorno e vínculo com o app",
      icon: "🧭",
      tone: "purple",
    },
    {
      title: "Notificações",
      value: stats.notifications,
      description: "estrutura preparada para comunicação futura",
      icon: "🔔",
      tone: "stone",
    },
  ];

  const internalContentMetrics: MetricCard[] = [
    {
      title: "Podcasts",
      value: stats.series,
      description: "podcasts devocionais cadastrados",
      icon: "📚",
      tone: "green",
    },
    {
      title: "Episódios",
      value: stats.episodes,
      description: "conteúdos publicados ou preparados",
      icon: "🎧",
      tone: "blue",
    },
    {
      title: "Agendados",
      value: stats.scheduledEpisodes,
      description: "episódios com data futura",
      icon: "⏰",
      tone: "purple",
    },
    {
      title: "Palavras do Dia",
      value: stats.dailyQuotes,
      description: "mensagens cadastradas para a aba Hoje",
      icon: "📖",
      tone: "gold",
    },
  ];

  const internalPrayerMetrics: MetricCard[] = [
    {
      title: "Públicos",
      value: stats.publicPrayers,
      description: "pedidos visíveis no mural",
      icon: "🌎",
      tone: "green",
    },
    {
      title: "Privados",
      value: stats.privatePrayers,
      description: "pedidos pastorais reservados",
      icon: "🔒",
      tone: "stone",
    },
    {
      title: "Respondidos",
      value: stats.answeredPrayers,
      description: "testemunhos marcados",
      icon: "✅",
      tone: "blue",
    },
    {
      title: "Eu orei",
      value: stats.prayerInteractions,
      description: "cliques de intercessão",
      icon: "🙌",
      tone: "gold",
    },
    {
      title: "Encorajamentos",
      value: stats.prayerEncouragements,
      description: "mensagens enviadas",
      icon: "💙",
      tone: "purple",
    },
  ];

  if (!isLogged) {
    return (
      <main className="admin-page">
        <section className="login-card">
          <div className="login-badge">Painel Admin</div>

          <h1>Djeone Martins</h1>

          <p>
            Acesse o painel ministerial para gerenciar devocionais, podcasts,
            orações e conteúdos do aplicativo.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="admin-password">Senha administrativa</label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha"
            />

            {loginError && <span className="form-error">{loginError}</span>}

            <button type="submit">Entrar no painel</button>
          </form>

          <Link href="/" className="back-link">
            Voltar para o aplicativo
          </Link>
        </section>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Painel Admin</span>
          <h1>Dashboard ministerial</h1>
          <p>
            Gerencie o aplicativo com foco em conteúdo, cuidado pastoral,
            crescimento e retenção.
          </p>
        </div>

        <div className="header-actions">
          <button type="button" onClick={loadStats} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <button type="button" className="logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">Hoje</span>
          <h2>Gerenciar aplicativo</h2>
          <p>
            {todayLabel}. Comece pelas ações principais: publicar conteúdo,
            organizar podcasts, acompanhar orações ou abrir o app.
          </p>
        </div>

        <div className="hero-numbers">
          <div>
            <strong>{formatNumber(stats.episodes)}</strong>
            <span>episódios</span>
          </div>

          <div>
            <strong>{formatNumber(totalPrayers)}</strong>
            <span>orações</span>
          </div>
        </div>
      </section>

      {loadError && <div className="alert">{loadError}</div>}

      <section className="section-block first-section">
        <div className="section-heading">
          <span className="eyebrow">Ações rápidas</span>
          <h2>O que você quer fazer agora?</h2>
        </div>

        <div className="actions-grid">
          {actionCards.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`action-card ${action.tone}`}
            >
              <div className="action-icon">{action.icon}</div>

              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading row-heading">
          <div>
            <span className="eyebrow">Crescimento e retenção</span>
            <h2>Sinais de vida no aplicativo</h2>
          </div>

          {lastUpdated && <span className="updated">Atualizado às {lastUpdated}</span>}
        </div>

        <div className="metrics-grid">
          {growthMetrics.map((metric) => (
            <article key={metric.title} className={`metric-card ${metric.tone}`}>
              <div className="metric-icon">{metric.icon}</div>
              <strong>{formatNumber(metric.value)}</strong>
              <h3>{metric.title}</h3>
              <p>{metric.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="internal-panel">
        <button
          type="button"
          className="internal-toggle"
          onClick={() => setShowInternalData((current) => !current)}
        >
          {showInternalData ? "Ocultar dados internos" : "Mostrar dados internos"}
        </button>

        {showInternalData && (
          <div className="internal-content">
            <div className="section-heading">
              <span className="eyebrow">Dados internos</span>
              <h2>Conteúdo e oração</h2>
              <p>
                Estes dados continuam disponíveis, mas ficam recolhidos para não
                poluir o dashboard principal.
              </p>
            </div>

            <h3 className="subheading">Produção e publicação</h3>

            <div className="metrics-grid compact">
              {internalContentMetrics.map((metric) => (
                <article key={metric.title} className={`metric-card ${metric.tone}`}>
                  <div className="metric-icon">{metric.icon}</div>
                  <strong>{formatNumber(metric.value)}</strong>
                  <h3>{metric.title}</h3>
                  <p>{metric.description}</p>
                </article>
              ))}
            </div>

            <h3 className="subheading">Comunidade e intercessão</h3>

            <div className="metrics-grid compact">
              {internalPrayerMetrics.map((metric) => (
                <article key={metric.title} className={`metric-card ${metric.tone}`}>
                  <div className="metric-icon">{metric.icon}</div>
                  <strong>{formatNumber(metric.value)}</strong>
                  <h3>{metric.title}</h3>
                  <p>{metric.description}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

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

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

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

  button,
  .internal-toggle {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.74);
    color: #f8fafc;
    border-radius: 16px;
    padding: 12px 18px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  button:hover,
  .internal-toggle:hover {
    transform: translateY(-1px);
    border-color: rgba(147, 197, 253, 0.5);
    background: rgba(30, 41, 59, 0.9);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  .logout-button {
    background: rgba(136, 19, 55, 0.3);
    border-color: rgba(244, 63, 94, 0.28);
  }

  .hero-panel {
    max-width: 1180px;
    margin: 32px auto 0;
    padding: 28px;
    border-radius: 32px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 64, 175, 0.38)),
      rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
    display: flex;
    justify-content: space-between;
    gap: 28px;
  }

  .hero-panel h2 {
    font-size: clamp(1.9rem, 3vw, 2.8rem);
    line-height: 1;
    letter-spacing: -0.06em;
  }

  .hero-panel p {
    color: #bfdbfe;
    margin-top: 14px;
    line-height: 1.7;
    max-width: 650px;
  }

  .hero-numbers {
    display: grid;
    grid-template-columns: repeat(2, minmax(130px, 1fr));
    gap: 16px;
    min-width: 320px;
    align-self: center;
  }

  .hero-numbers div {
    padding: 20px;
    border-radius: 22px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(147, 197, 253, 0.22);
  }

  .hero-numbers div:nth-child(2) {
    border-color: rgba(245, 158, 11, 0.28);
  }

  .hero-numbers strong {
    display: block;
    font-size: 2rem;
    letter-spacing: -0.05em;
  }

  .hero-numbers span {
    color: #bfdbfe;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: lowercase;
  }

  .section-block,
  .internal-panel {
    max-width: 1180px;
    margin: 36px auto 0;
  }

  .first-section {
    margin-top: 34px;
  }

  .section-heading {
    margin-bottom: 18px;
  }

  .section-heading h2 {
    font-size: clamp(1.45rem, 2.4vw, 2.1rem);
    letter-spacing: -0.06em;
    line-height: 1.08;
  }

  .section-heading p {
    margin-top: 8px;
    color: #bfdbfe;
    line-height: 1.6;
  }

  .row-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
  }

  .updated {
    color: #93c5fd;
    font-size: 0.8rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .action-card {
    min-height: 124px;
    border-radius: 26px;
    padding: 20px;
    display: flex;
    gap: 16px;
    align-items: center;
    text-decoration: none;
    color: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.78);
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .action-card:hover {
    transform: translateY(-2px);
    border-color: rgba(147, 197, 253, 0.42);
    background: rgba(15, 23, 42, 0.96);
  }

  .action-icon {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    font-size: 1.55rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .action-card h3 {
    font-size: 1.05rem;
    letter-spacing: -0.04em;
    margin-bottom: 7px;
  }

  .action-card p {
    color: #bfdbfe;
    line-height: 1.55;
    font-size: 0.9rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .metrics-grid.compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .metric-card {
    min-height: 154px;
    border-radius: 26px;
    padding: 22px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.78);
  }

  .metric-icon {
    font-size: 1.45rem;
    margin-bottom: 18px;
  }

  .metric-card strong {
    display: block;
    font-size: 2.15rem;
    line-height: 1;
    letter-spacing: -0.06em;
    margin-bottom: 9px;
  }

  .metric-card h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    margin-bottom: 6px;
    color: #dbeafe;
  }

  .metric-card p {
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

  .purple {
    background: linear-gradient(135deg, rgba(88, 28, 135, 0.28), rgba(15, 23, 42, 0.88));
    border-color: rgba(168, 85, 247, 0.24);
  }

  .rose {
    background: linear-gradient(135deg, rgba(136, 19, 55, 0.25), rgba(15, 23, 42, 0.88));
    border-color: rgba(244, 63, 94, 0.22);
  }

  .stone {
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.28), rgba(15, 23, 42, 0.88));
    border-color: rgba(148, 163, 184, 0.2);
  }

  .internal-panel {
    padding-top: 8px;
  }

  .internal-toggle {
    width: 100%;
    text-align: center;
  }

  .internal-content {
    margin-top: 20px;
    padding: 24px;
    border-radius: 30px;
    background: rgba(15, 23, 42, 0.56);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  .subheading {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #bfdbfe;
    margin: 26px 0 14px;
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
    border-radius: 16px;
    padding: 14px 16px;
    outline: none;
  }

  input:focus {
    border-color: rgba(147, 197, 253, 0.56);
  }

  .form-error {
    color: #fecaca;
    font-size: 0.86rem;
    font-weight: 800;
  }

  form button {
    margin-top: 4px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-color: rgba(147, 197, 253, 0.35);
  }

  .back-link {
    display: inline-block;
    color: #93c5fd;
    text-decoration: none;
    font-weight: 900;
    margin-top: 22px;
  }

  @media (max-width: 900px) {
    .admin-page {
      padding: 24px 14px 48px;
    }

    .admin-header,
    .hero-panel,
    .row-heading {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions button {
      flex: 1;
    }

    .hero-numbers {
      min-width: 0;
      width: 100%;
    }

    .actions-grid,
    .metrics-grid,
    .metrics-grid.compact {
      grid-template-columns: 1fr;
    }

    .action-card {
      min-height: auto;
    }

    .updated {
      white-space: normal;
    }
  }
`;