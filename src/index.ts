/**
 * Cloudflare Workers AI Image Generation Proxy
 * 
 * This worker proxies image generation requests to Cloudflare Workers AI.
 * Supports dynamic model selection and generation parameters.
 */

interface Env {
	AI: Ai;
}

interface RequestBody {
	prompt: string;
	model?: string;
	seed?: number;
	width?: number;
	height?: number;
}

interface ImageResponse {
	success: boolean;
	error?: string;
	mimeType?: string;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

// デフォルトモデル - 実際に利用可能なモデル（2026-11-24版）
const DEFAULT_MODELS = [
	'@cf/black-forest-labs/flux-2-klein-9b',  // 推奨：9B・画像編集対応
	'@cf/black-forest-labs/flux-2-dev',       // 高精細・マルチリファレンス対応
	'@cf/black-forest-labs/flux-1-schnell',   // 高速・12B
	'@cf/black-forest-labs/flux-2-klein-4b',  // 超高速・画像編集対応
	'@cf/leonardo/phoenix-1.0',                // テキスト描画・プロンプト追従性重視
];

// サポートされているモデル一覧
const SUPPORTED_MODELS = DEFAULT_MODELS;

// 廃止予定のモデル一覧
const DEPRECATED_MODELS: Record<string, string> = {
	'@cf/bytedance/stable-diffusion-xl-lightning': 'Deprecated as of 2026-11-20',
	'@cf/stabilityai/stable-diffusion-xl-base-1.0': 'Replaced by FLUX models',
};

function validateModel(model: string | undefined): string {
	if (!model) return DEFAULT_MODELS[0];
	
	// 廃止モデルの場合は警告ログを出力
	if (DEPRECATED_MODELS[model]) {
		console.warn(`Model status: ${model}. ${DEPRECATED_MODELS[model]}`);
	}
	
	return model;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CORS プリフライト対応
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return json({ error: 'POST method required' }, 405);
		}

		let body: RequestBody;
		try {
			body = await request.json<RequestBody>();
		} catch (error) {
			return json({ error: 'Invalid JSON in request body' }, 400);
		}

		// プロンプトの検証
		if (!body.prompt || typeof body.prompt !== 'string') {
			return json({ error: 'prompt is required (string)' }, 400);
		}

		if (body.prompt.length > 10000) {
			return json({ error: 'prompt must be 10000 characters or less' }, 400);
		}

		// パラメータの検証と取得
		const requestedModel = validateModel(body.model);
		const seed = body.seed !== undefined ? Math.floor(body.seed) : undefined;
		const width = body.width ?? 512;
		const height = body.height ?? 768;

		// 次元の検証（Cloudflare AI の制限に合わせる）
		if (width < 64 || width > 1536 || height < 64 || height > 1536) {
			return json(
				{ error: 'width and height must be between 64 and 1536' },
				400,
			);
		}

		// モデル試行リスト: リクエストされたモデル優先、その後デフォルトモデルをフォールバック
		const modelsToTry = [
			requestedModel,
			...DEFAULT_MODELS.filter((m) => m !== requestedModel),
		];

		let lastError: string | null = null;
		let usedModel: string | null = null;

		// モデルをループして試行
		for (const model of modelsToTry) {
			try {
				console.log(`Attempting model: ${model}`);

				// Cloudflare Workers AI へのリクエスト
				const inputs = {
					prompt: body.prompt,
					...(seed !== undefined && { seed }),
					width,
					height,
				};

				const response = await env.AI.run(model, inputs);

				// レスポンスをバイナリとして返す
				return new Response(response, {
					headers: {
						...corsHeaders,
						'Content-Type': 'image/png',
						'Cache-Control': 'no-store',
						'X-Model-Used': model,
						'X-Original-Model': requestedModel,
					},
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.error(`Model ${model} failed: ${errorMessage}`);
				lastError = errorMessage;

				// 廃止されたモデルや利用不可のエラーの場合は次のモデルを試行
				if (
					errorMessage.includes('was deprecated') ||
					errorMessage.includes('Model not found') ||
					errorMessage.includes('not found') ||
					errorMessage.includes('No such model') ||
					errorMessage.includes('5006') ||
					errorMessage.includes('5007') ||
					errorMessage.includes('5028')
				) {
					continue;
				}

				// それ以外のエラーは即座に返す（レート制限、プロンプト制限など）
				if (errorMessage.includes('429')) {
					return json(
						{
							error: 'Rate limited by Cloudflare AI',
							details: 'Please retry after a delay',
						},
						429,
					);
				}

				// プロンプト関連のエラー
				if (
					errorMessage.includes('prompt') ||
					errorMessage.includes('input') ||
					errorMessage.includes('invalid')
				) {
					return json(
						{
							error: 'Invalid prompt or parameters',
							details: errorMessage,
						},
						400,
					);
				}
			}
		}

		// すべてのモデルが失敗した場合
		return json(
			{
				error: 'Failed to generate image with all available models',
				details: lastError || 'Unknown error',
				requestedModel,
				availableModels: SUPPORTED_MODELS,
			},
			503,
		);
	},
} satisfies ExportedHandler<Env>;
