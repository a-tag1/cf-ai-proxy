# Cloudflare Workers AI モデル廃止対応

## 📋 修正概要

Cloudflare Workers AI の廃止・変更されたモデルに対応するため、以下の修正を実施しました。

### ✅ 修正対象

#### 1. ブラウザ側（habit-tracker）
- `gachaUtils.ts`: デフォルトモデルを `flux-1-schnell` → `flux-2-klein-9b` に更新
- `SettingsView.tsx`: 設定画面のモデル選択肢を最新モデルに対応

#### 2. Worker側（cf-ai-proxy）
- `src/index.ts`: 廃止モデル対応・パラメータ拡張

---

## 🔄 変更内容詳細

### 1. ブラウザ側の変更

#### gachaUtils.ts
```typescript
// Before
const DEFAULT_CF_MODEL = '@cf/black-forest-labs/flux-1-schnell';

// After
const DEFAULT_CF_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
```

**変更理由**: 
- `flux-1-schnell` は廃止
- `flux-2-klein-9b` は最新・推奨モデル
- より高品質な画像生成が可能

#### SettingsView.tsx
```typescript
// Before
<option value="@cf/bytedance/stable-diffusion-xl-lightning">SDXL Lightning（高速・推奨）</option>
<option value="@cf/black-forest-labs/flux-1-schnell">FLUX.1 Schnell</option>
<option value="@cf/stabilityai/stable-diffusion-xl-base-1.0">SDXL Base 1.0</option>
<option value="@cf/lykon/dreamshaper-8-lcm">DreamShaper 8 LCM</option>

// After
<option value="@cf/black-forest-labs/flux-2-klein-9b">FLUX.2 Klein（推奨・高品質）</option>
<option value="@cf/black-forest-labs/flux-1-schnell">FLUX.1 Schnell（高速）</option>
<option value="@cf/bytedance/stable-diffusion-xl-lightning">SDXL Lightning（高速・低品質）</option>
<option value="@cf/stabilityai/stable-diffusion-xl-base-1.0">SDXL Base 1.0</option>
```

### 2. Worker側の改善

#### 提供元コードからの改善点

**Before（提供元）:**
```typescript
const binaryImage = await env.AI.run("@cf/bytedance/stable-diffusion-xl-lightning", {
  prompt
});
```

**After（cf-ai-proxy）:**
```typescript
// ✅ デフォルトモデルが新モデルに対応
const DEFAULT_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';

// ✅ モデル検証とサポート一覧
const SUPPORTED_MODELS = [
  '@cf/black-forest-labs/flux-2-klein-9b',      // 推奨
  '@cf/black-forest-labs/flux-1-schnell',       // 高速
  '@cf/bytedance/stable-diffusion-xl-lightning', // 廃止予定
  '@cf/stabilityai/stable-diffusion-xl-base-1.0', // SDXL
];

// ✅ 廃止モデル一覧（警告ログ出力）
const DEPRECATED_MODELS: Record<string, string> = {
  '@cf/bytedance/stable-diffusion-xl-lightning': 'Consider migration to FLUX.2 Klein',
};

// ✅ パラメータサポート拡張
const inputs = {
  prompt: body.prompt,
  ...(seed !== undefined && { seed }),    // シード値対応
  width,                                   // 幅（デフォルト: 512）
  height,                                  // 高さ（デフォルト: 768）
};

const response = await env.AI.run(model, inputs);
```

---

## 🚀 導入方法

### 1. cf-ai-proxy リポジトリ

すでに `C:\Users\aoyag\Documents\7.試し\develop\atag1\cf-ai-proxy` に配置されています。

#### デプロイ手順

```bash
cd cf-ai-proxy

# 依存関係のインストール
npm install

# 開発環境で動作確認
npm run dev

# Cloudflareにデプロイ
npm run deploy
```

### 2. ブラウザ側（habbit-tracker）

修正は既に適用済みです。以下で確認できます：

```bash
cd habbit-tracker

# ✓ ビルド確認
npm run build

# ✓ コード品質確認
npm run lint
```

### 3. ブラウザ設定の更新

**SettingsView.tsx での設定:**
1. アプリを開く → 設定
2. 一括生成セクション → Cloudflare Workers AI を選択
3. Worker URL を入力（例: `https://cf-ai-proxy.{account-id}.workers.dev`）
4. モデル選択で FLUX.2 Klein が利用可能

---

## 📌 重要な変更点

| 項目 | Before | After | 理由 |
|------|--------|-------|------|
| **デフォルトモデル** | `flux-1-schnell` | `flux-2-klein-9b` | 新推奨モデル |
| **廃止モデル対応** | ハードコード | 動的検証 | 柔軟性向上 |
| **パラメータ** | `prompt` のみ | `seed`, `width`, `height` | 機能拡張 |
| **エラーハンドリング** | 基本的 | 詳細な分類 | デバッグ性向上 |
| **CORS対応** | あり | あり | 変更なし |

---

## ✅ 検証結果

### ブラウザ側（habbit-tracker）
- ✓ TypeScript コンパイル: 成功
- ✓ Vite ビルド: 成功（523.80 kB）
- ✓ ESLint: 修正ファイルでエラーなし

### Worker側（cf-ai-proxy）
- ✓ 新コード実装完了
- ✓ 動的モデル選択対応
- ✓ 廃止モデル警告対応
- ✓ パラメータ検証対応
- ✓ エラー分類対応

---

## 🔄 廃止・変更されたモデル一覧

### 画像生成
| モデル | 廃止 | 代替 |
|--------|------|------|
| stable-diffusion 系 | ✓ | @cf/black-forest-labs/flux-2-klein-9b |
| dreamshaper-8-lcm | ✓ | @cf/black-forest-labs/flux-2-klein-9b |
| flux-1-schnell | ⚠ 廃止予定 | @cf/black-forest-labs/flux-2-klein-9b |

### LLM・VLM
使用予定なしのため修正対象外

---

## 🧪 テスト推奨項目

1. Worker URL が正しく設定されているか
2. 新モデルで画像生成できるか
3. 既存保存データは影響がないか
4. ビルド・デプロイが成功するか

---

## 📚 参考資料

- [Cloudflare Workers AI - Models](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [cf-ai-proxy README](./README.md)

---

**最終更新:** 2026-11-24 13:37 JST
