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

// デフォルトモデル（新推奨モデルに更新）
const DEFAULT_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';

// サポートされているモデル一覧
const SUPPORTED_MODELS = [
	'@cf/black-forest-labs/flux-2-klein-9b',      // 新推奨：高品質
	'@cf/black-forest-labs/flux-1-schnell',       // 高速生成
	'@cf/bytedance/stable-diffusion-xl-lightning', // 高速・低品質
	'@cf/stabilityai/stable-diffusion-xl-base-1.0', // SDXL Base
];

// 廃止予定のモデル一覧
const DEPRECATED_MODELS: Record<string, string> = {
	'@cf/bytedance/stable-diffusion-xl-lightning': 'Still supported but consider migration to FLUX.2 Klein',
};

function validateModel(model: string | undefined): string {
	if (!model) return DEFAULT_MODEL;
	
	// 廃止モデルの場合は警告ログを出力（本来はログサービスに送信）
	if (DEPRECATED_MODELS[model]) {
		console.warn(`Deprecated model: ${model}. ${DEPRECATED_MODELS[model]}`);
	}
	
	// 未サポートモデルでもCloudflareが対応していれば試行（カスタムモデル対応）
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
		const model = validateModel(body.model);
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

		try {
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
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('AI.run error:', errorMessage);

			// 特定のエラーを処理
			if (errorMessage.includes('429')) {
				return json(
					{
						error: 'Rate limited by Cloudflare AI',
						details: 'Please retry after a delay',
					},
					429,
				);
			}

			if (errorMessage.includes('Model not found')) {
				return json(
					{
						error: 'Model not found',
						model,
						supportedModels: SUPPORTED_MODELS,
					},
					400,
				);
			}

			return json(
				{
					error: 'Failed to generate image',
					details: errorMessage,
					model,
				},
				500,
			);
		}
	},
} satisfies ExportedHandler<Env>;
