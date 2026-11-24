# cf-ai-proxy デプロイガイド

## 前提条件

- Cloudflare アカウント（無料プランでOK）
- Node.js 18以上
- npm / yarn

## セットアップ手順

### 1. Wrangler CLIのインストール

```bash
npm install -g wrangler
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開きCloudflareのログイン画面が表示されます。

### 3. プロジェクト設定

#### wrangler.toml の確認・編集

```toml
name = "cf-ai-proxy"
type = "service"
main = "src/index.ts"
compatibility_date = "2024-11-24"

[env.production]
name = "cf-ai-proxy"
routes = [
  { pattern = "cf-ai-proxy.*.workers.dev", zone_name = "" }
]
```

### 4. デプロイ

```bash
# 開発環境でテスト
npm run dev

# Cloudflareにデプロイ
npm run deploy
```

デプロイ後、以下の形式のURLが生成されます：
```
https://cf-ai-proxy.{account-id}.workers.dev
```

## 動作確認

### cURL でのテスト

```bash
curl -X POST https://cf-ai-proxy.{account-id}.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over the ocean",
    "model": "@cf/black-forest-labs/flux-2-klein-9b",
    "width": 512,
    "height": 768
  }' \
  -o test-image.png

echo "Image saved to test-image.png"
```

### JavaScript / TypeScript でのテスト

```typescript
const workerUrl = 'https://cf-ai-proxy.{account-id}.workers.dev';

const response = await fetch(workerUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful sunset over the ocean',
    model: '@cf/black-forest-labs/flux-2-klein-9b',
    width: 512,
    height: 768,
  }),
});

if (response.ok) {
  const blob = await response.blob();
  console.log('Image generated:', blob.size, 'bytes');
  
  // ブラウザで表示する場合
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  document.body.appendChild(img);
} else {
  const error = await response.json();
  console.error('Error:', error);
}
```

## Cloudflare Dashboardでの確認

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. **Workers** をクリック
3. **cf-ai-proxy** が表示されていることを確認
4. クリックして詳細情報（URL、ログなど）を確認

## ログの確認

```bash
# 最新のログを表示
wrangler tail

# 特定のログを検索
wrangler tail --format pretty
```

## 本番環境での推奨設定

### 1. カスタムドメインの設定

Cloudflare Dashboardで以下の設定を行うことで、カスタムドメインでWorkerを公開できます：

1. Workers → cf-ai-proxy → Settings
2. Routes セクションで Routes を追加
3. パターン例：`api.yourdomain.com/*`

### 2. 環境変数の設定（本番環境）

`.env.production` を作成：
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### 3. バージョン管理

リリース時に以下を実行：
```bash
# 本番環境にデプロイ
wrangler deploy --env production
```

## トラブルシューティング

### エラー: "Authentication required"
```bash
# 再度ログイン
wrangler login
```

### エラー: "Build failed"
```bash
# 依存関係の確認
npm install

# TypeScriptのコンパイルテスト
npm run build
```

### エラー: "Module not found"
```bash
# キャッシュをクリアしてデプロイ
npm run deploy --force
```

### Worker が 500 エラーを返す

Cloudflare Dashboardでログを確認：
1. Workers → cf-ai-proxy → Logs
2. エラーメッセージを確認
3. Cloudflare AI の利用状況を確認

## セキュリティのベストプラクティス

### 1. レート制限

今後のアップデートで実装推奨：
```typescript
// 例: リクエストごとのレート制限
const requestCount = new Map();
```

### 2. プロンプトフィルタリング

有害な内容をフィルタリング（オプション）：
```typescript
const bannedKeywords = ['violence', 'adult'];
if (bannedKeywords.some(kw => body.prompt.includes(kw))) {
  return json({ error: 'Inappropriate content' }, 400);
}
```

### 3. モデル制限

特定のモデルのみに制限：
```typescript
const ALLOWED_MODELS = [
  '@cf/black-forest-labs/flux-2-klein-9b',
  '@cf/black-forest-labs/flux-1-schnell',
];

if (!ALLOWED_MODELS.includes(model)) {
  return json({ error: 'Model not allowed' }, 400);
}
```

## 参考資料

- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## よくある質問（FAQ）

### Q: 無料プランで使用できますか？
A: はい。Workers は月100万リクエストまで無料です。Workers AI の生成は従量課金です。

### Q: 画像生成にはどのくらい時間がかかりますか？
A: モデルにより異なります。FLUX.2 Klein は数秒～数十秒です。

### Q: リージョンを指定できますか？
A: いいえ。Cloudflareが最適なリージョンを自動選択します。

---

**最終更新:** 2026-11-24 JST
