import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'djeonewill@gmail.com'
  return raw
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return { authorized: false, status: 401, error: 'Autenticação necessária.' } as const
  }

  const isAdmin = getAdminEmails().includes(user.email.toLowerCase())

  if (!isAdmin) {
    return { authorized: false, status: 403, error: 'Acesso não autorizado.' } as const
  }

  return { authorized: true } as const
}

export async function GET() {
  // ─── Verificação de autenticação ───────────────────────────
  const auth = await requireAdmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    )
  }

  const adminClient = createSupabaseAdminClient()

  try {
    const { data, error } = await adminClient
      .from("mantenedores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[mantenedores-get] Erro:", error);
      return NextResponse.json(
        { success: false, error: "Erro ao carregar mantenedores." },
        { status: 500 },
      );
    }

    const mantenedores = data ?? [];
    const total = mantenedores.length;
    const somaValores = mantenedores.reduce(
      (acc: number, m: { valor_mensal?: number | null }) =>
        acc + (m.valor_mensal ?? 0),
      0,
    );

    return NextResponse.json({
      success: true,
      total,
      somaValores,
      mantenedores,
    });
  } catch (error) {
    console.error("[mantenedores-get] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno ao carregar mantenedores.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // ─── Verificação de autenticação ───────────────────────────
  const auth = await requireAdmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    )
  }

  const adminClient = createSupabaseAdminClient()

  try {
    const body = await request.json();
    const { nome, whatsapp, email, valor_mensal } = body ?? {};

    // Validate minimum required field
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "O campo Nome é obrigatório." },
        { status: 400 },
      );
    }

    const valor = valor_mensal
      ? parseFloat(String(valor_mensal).replace(",", "."))
      : null;

    if (valor !== null && (isNaN(valor) || valor < 0)) {
      return NextResponse.json(
        { success: false, error: "O valor mensal deve ser um número válido." },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient
      .from("mantenedores")
      .insert({
        nome: nome.trim(),
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim() || null,
        valor_mensal: valor,
      })
      .select()
      .single();

    if (error) {
      console.error("[mantenedores-post] Erro:", error);
      return NextResponse.json(
        { success: false, error: "Erro ao salvar mantenedor." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, mantenedor: data });
  } catch (error) {
    console.error("[mantenedores-post] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno ao salvar mantenedor.",
      },
      { status: 500 },
    );
  }
}