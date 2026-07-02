# TWA-001 — Preparação para Google Play Store via Trusted Web Activity

> **Fase:** 4 — Preparação TWA
>
> **Data:** 2026-06-22
>
> **Status:** Infraestrutura configurada (placeholders pendentes de preenchimento)
>
> **Objetivo:** Configurar o app Djeone Martins para publicação na Google Play Store como Trusted Web Activity (TWA).

---

## 1. Arquivos Modificados

| Arquivo | Ação | Descrição |
|---|---|---|
| `public/manifest.json` | Modificado | Adicionados campos `prefer_related_applications` e `related_applications` |
| `public/.well-known/assetlinks.json` | Criado | Digital Asset Links para validação de domínio pelo Google |
| `cloud.md` | Atualizado | Adicionada Seção 6 (Fase 4) com checklist TWA |
| `reports/TWA-001-PLAY-STORE-PREPARATION.md` | Criado | Este relatório técnico |

Nenhum outro arquivo do projeto foi alterado.

---

## 2. Detalhamento Técnico

### 2.1 `public/manifest.json` — Campos TWA Adicionados

#### Bloco adicionado:

```json
"prefer_related_applications": true,
"related_applications": [
  {
    "platform": "play",
    "id": "com.djeonemartins.app",
    "url": "https://play.google.com/store/apps/details?id=com.djeonemartins.app"
  }
]
```

#### Explicação dos campos:

| Campo | Valor Atual | Descrição | Ação Pendente |
|---|---|---|---|
| `prefer_related_applications` | `true` | Indica ao Chrome que o app nativo deve ser preferido sobre a PWA quando instalado | Nenhuma — valor final |
| `platform` | `"play"` | Identifica a loja como Google Play Store | Nenhuma — valor fixo |
| `id` | `"com.djeonemartins.app"` | Package name do app Android | **Substituir** pelo package name definitivo do projeto Android |
| `url` | `"https://play.google.com/store/apps/details?id=com.djeonemartins.app"` | URL da listagem na Play Store | **Substituir** pelo package name real na URL |

#### Manifest completo (pós-alteração):

```json
{
  "name": "Djeone Martins",
  "short_name": "Djeone",
  "description": "Devocional diário em áudio, Palavra do Dia, leitura bíblica e oração com Pr. Djeone Martins.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#020617",
  "theme_color": "#020617",
  "categories": ["religion", "lifestyle", "education"],
  "lang": "pt-BR",
  "prefer_related_applications": true,
  "related_applications": [
    {
      "platform": "play",
      "id": "com.djeonemartins.app",
      "url": "https://play.google.com/store/apps/details?id=com.djeonemartins.app"
    }
  ],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

### 2.2 `public/.well-known/assetlinks.json` — Digital Asset Links

#### Localização:
```
public/.well-known/assetlinks.json
→ Servido em: https://<domínio>/.well-known/assetlinks.json
```

O Next.js serve automaticamente arquivos estáticos do diretório `public/` na raiz do domínio. Arquivos dentro de `public/.well-known/` são acessíveis em `/.well-known/`.

#### Conteúdo do arquivo:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.djeonemartins.app",
      "sha256_cert_fingerprints": [
        "PLACEHOLDER_REPLACE_WITH_RELEASE_KEY_SHA256"
      ]
    }
  }
]
```

#### Explicação dos campos:

| Campo | Valor Atual | Descrição | Ação Pendente |
|---|---|---|---|
| `relation` | `["delegate_permission/common.handle_all_urls"]` | Permissão para o app Android abrir todas as URLs do domínio no TWA | Nenhuma — valor fixo |
| `namespace` | `"android_app"` | Namespace do target (app Android) | Nenhuma — valor fixo |
| `package_name` | `"com.djeonemartins.app"` | Package name do app Android | **Substituir** pelo package name definitivo |
| `sha256_cert_fingerprints` | `["PLACEHOLDER..."]` | Array de fingerprints SHA-256 do certificado de assinatura | **Substituir** pelo fingerprint real |

#### Como obter o SHA-256 certificate fingerprint:

**Opção A — Via keytool (keystore local):**
```bash
keytool -list -v -keystore <caminho-do-keystore.jks> -alias <alias> -storepass <senha> -keypass <senha> 2>/dev/null | grep SHA256
```

**Opção B — Via Google Play Console (recomendado):**
1. Acesse [Google Play Console](https://play.google.com/console)
2. Selecione o app
3. Navegue para: **Setup** → **App Integrity** → **App Signing**
4. Copie o **SHA-256 certificate fingerprint** da seção "App signing key certificate" ou "Upload key certificate"

> **Nota importante:** Se o Google gerencia a assinatura (Play App Signing), use o fingerprint da **App signing key certificate**. Se você gerencia a assinatura, use o fingerprint da **Upload key certificate**.

---

### 2.3 Como o Next.js serve o `assetlinks.json`

O arquivo está em `public/.well-known/assetlinks.json`. O Next.js serve arquivos da pasta `public/` estaticamente, mapeando a estrutura de diretórios para o path da URL:

```
public/.well-known/assetlinks.json  →  GET /.well-known/assetlinks.json
```

**Content-Type:** O Next.js infere `application/json` automaticamente pela extensão `.json`.

**Verificação após deploy:**
```bash
curl -I https://<domínio>/.well-known/assetlinks.json
# Deve retornar: Content-Type: application/json
```

**Cabeçalhos CORS:** O Google não exige CORS para `assetlinks.json`, mas o Next.js não adiciona cabeçalhos CORS automaticamente para arquivos estáticos. Se necessário, configurar no `next.config.ts`:

```ts
// next.config.ts (se necessário)
async headers() {
  return [
    {
      source: '/.well-known/assetlinks.json',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Content-Type', value: 'application/json' },
      ],
    },
  ]
}
```

**Atualmente isso NÃO foi adicionado** — avalie se necessário com base no teste de verificação.

---

### 2.4 Como o Google verifica os Digital Asset Links

1. O Google Play Console lê o `AndroidManifest.xml` do app Android e extrai o `asset_statements` (ou a configuração equivalente em `strings.xml`)
2. O Google faz uma requisição HTTP para `https://<domínio>/.well-known/assetlinks.json`
3. Verifica se o `package_name` e `sha256_cert_fingerprints` batem com o app publicado
4. Se a verificação passar, o TWA é autorizado a abrir o domínio sem a barra de endereço do Chrome

**Ferramenta de validação oficial:**
- 🔗 [Digital Asset Links Validator](https://developers.google.com/digital-asset-links/tools/generator)

---

## 3. Checklist de Publicação TWA

### 3.1 Infraestrutura Web (Este Projeto)

| Item | Status | Observação |
|---|---|---|
| `manifest.json` com `prefer_related_applications: true` | ✅ | Placeholders pendentes |
| `manifest.json` com `related_applications` | ✅ | Placeholders pendentes |
| `assetlinks.json` em `/.well-known/assetlinks.json` | ✅ | Placeholders pendentes |
| Ícones PWA (192x192 e 512x512) | ✅ | Reutiliza mesmos PNGs para `any` e `maskable` |
| Ícone maskable com padding seguro (512x512) | ❌ | **Pendente** — Google exige zona segura de ~80% |
| `assetlinks.json` acessível publicamente | ⏳ | Verificar após deploy |
| Content-Type `application/json` no `assetlinks.json` | ⏳ | Automático pelo Next.js |
| Cabeçalhos CORS no `assetlinks.json` | ⏳ | Avaliar necessidade |
| Substituir `package_name` placeholder | ❌ | **Ação do Djeone/consultor** |
| Substituir `sha256_cert_fingerprints` placeholder | ❌ | **Ação do Djeone/consultor** |

### 3.2 Lado Android (Fora do escopo deste projeto)

| Item | Descrição |
|---|---|
| Criar projeto Android com TWA | Usar `android-browser-helper` ou Bubblewrap (`bubblewrap init`) |
| Configurar `asset_statements` | No `AndroidManifest.xml` ou `strings.xml`, referenciando `/.well-known/assetlinks.json` |
| Gerar keystore de release | Para assinar o APK/AAB |
| Submeter à Play Store | Via Google Play Console |

---

## 4. Próximos Passos Recomendados

1. **Definir o package name definitivo** do app Android e atualizar:
   - `public/manifest.json` → `related_applications[0].id` e `.url`
   - `public/.well-known/assetlinks.json` → `target.package_name`

2. **Obter o SHA-256 fingerprint** do certificado de assinatura e atualizar:
   - `public/.well-known/assetlinks.json` → `target.sha256_cert_fingerprints`

3. **Criar ícone maskable dedicado** (512x512 com padding seguro de ~80%):
   - Pode ser adicionado como `public/icon-512-maskable.png`
   - Atualizar `manifest.json` para referenciar o novo arquivo no slot `maskable`

4. **Fazer deploy e verificar:**
   ```bash
   curl https://<domínio>/.well-known/assetlinks.json
   ```

5. **Validar com a ferramenta oficial do Google:**
   - Acessar: https://developers.google.com/digital-asset-links/tools/generator
   - Preencher domínio, package name e fingerprint
   - Clicar em "Test Statement"

---

## 5. Referências

- [Google Digital Asset Links — Documentação Oficial](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Trusted Web Activity — Guia Rápido](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
- [Bubblewrap — CLI para gerar TWA](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWA Manifest — Especificação W3C](https://www.w3.org/TR/appmanifest/)