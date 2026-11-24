# cf-ai-proxy

Cloudflare Workers AI Image Generation Proxy - Supports dynamic model selection and generation parameters.

## 概要

このプロジェクトはCloudflare Workers AI の画像生成APIをプロキシするWorker実装です。ブラウザからのリクエストをCloudflare Workers AIにリレーし、使用するモデルを動的に選択できます。

## 機能

- ✅ **動的モデル選択**: リクエストパラメータでモデルを指定可能
- ✅ **パラメータ拡張**: `seed`、`width`、`height` に対応
- ✅ **廃止モデル対応**: 廃止予定モデルは警告ログ出力
- ✅ **エラー分類**: 詳細なエラー分類とレスポンス
- ✅ **CORS対応**: ブラウザからのクロスオリジンリクエストに対応
- ✅ **キャッシュ制御**: `Cache-Control: no-store` を設定

## デフォルトモデル

**`@cf/black-forest-labs/flux-2-klein-9b`**（推奨・高品質）

## サポートモデル

| モデル | 説明 |
|--------|------|
| `@cf/black-forest-labs/flux-2-klein-9b` | 推奨・高品質 |
| `@cf/black-forest-labs/flux-1-schnell` | 高速生成 |
| `@cf/bytedance/stable-diffusion-xl-lightning` | 高速・低品質（廃止予定） |
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | SDXL Base |

## APIリクエスト仕様

### エンドポイント

```
POST /
```

### リクエストボディ

```json
{
  "prompt": "a beautiful sunset over the ocean",
  "model": "@cf/black-forest-labs/flux-2-klein-9b",
  "seed": 12345,
  "width": 512,
  "height": 768
}
```

### パラメータ

| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|-----|------|------|-----------|
| `prompt` | string | ✅ | 画像生成プロンプト | - |
| `model` | string | ❌ | 使用モデル | `@cf/black-forest-labs/flux-2-klein-9b` |
| `seed` | number | ❌ | ランダムシード | - |
| `width` | number | ❌ | 画像幅（64-1536） | 512 |
| `height` | number | ❌ | 画像高さ（64-1536） | 768 |

### レスポンス

#### 成功時
```
Content-Type: image/png
X-Model-Used: @cf/black-forest-labs/flux-2-klein-9b

[バイナリ画像データ]
```

#### エラー時
```json
{
  "error": "prompt is required (string)"
}
```

## セットアップ

### 前提条件

- Node.js 18以上
- Wrangler CLI (`npm install -g wrangler`)

### インストール

```bash
npm install
```

### 開発

```bash
npm run dev
```

### デプロイ

```bash
npm run deploy
```

Cloudflareアカウントにログインしてデプロイすると、`https://cf-ai-proxy.{account-id}.workers.dev` で利用可能になります。

## 使用例

### cURL

```bash
curl -X POST https://cf-ai-proxy.{account-id}.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset",
    "model": "@cf/black-forest-labs/flux-2-klein-9b",
    "width": 512,
    "height": 768
  }' \
  -o output.png
```

### JavaScript

```typescript
const response = await fetch('https://cf-ai-proxy.{account-id}.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful sunset',
    model: '@cf/black-forest-labs/flux-2-klein-9b',
    width: 512,
    height: 768,
  }),
});

const imageBlob = await response.blob();
```

## トラブルシューティング

### エラー: "Model not found"
- 指定したモデルが廃止されていないか確認
- Cloudflare公式ドキュメントで利用可能なモデルを確認

### エラー: "Rate limited"
- リクエスト間隔を広げる

### CORS エラー
- Worker URL が正しく設定されているか確認
- CORSヘッダーが正しく返されているか確認

## 廃止モデルからの移行

### 廃止予定モデル

| 廃止モデル | 推奨代替モデル |
|-----------|----------------|
| `stable-diffusion` 系 | `@cf/black-forest-labs/flux-2-klein-9b` |
| `dreamshaper-8-lcm` | `@cf/black-forest-labs/flux-2-klein-9b` |
| `flux-1-schnell` | `@cf/black-forest-labs/flux-2-klein-9b` |

## 参考資料

- [Cloudflare Workers AI - Models](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。
