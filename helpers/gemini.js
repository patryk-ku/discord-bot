const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

exports.imagePrompt = async (prompt, attachment) => {
	// Check image type
	const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
	if (!allowedImageTypes.includes(attachment.contentType)) {
		throw {
			text: 'File type not supported. (Allowed file types: **.png, .jpg, .webp, .heic, .heif**)',
		};
	}

	// Check image size. Max 4 MB for enire request so I let 2,75 for image because of base64 conversion rate
	const maxImageSize = 1024 * 1024 * 2.75;
	if (Number(attachment.size) > maxImageSize) {
		throw { text: 'File too big. (Max file size is **2,75 MB**)' };
	}

	// Donwnload image to buffer
	let buffer;
	try {
		const response = await fetch(attachment.url);
		buffer = await response.arrayBuffer();
	} catch (error) {
		console.log(error);
		throw { text: 'Failed to download image.' };
	}

	// Init model with settings
	const generationConfig = this.generationConfig;
	const safetySettings = this.safetySettings;

	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	const model = genAI.getGenerativeModel({
		model: 'gemini-1.5-flash',
		generationConfig,
		safetySettings,
	});
	const image = {
		inlineData: {
			data: Buffer.from(buffer).toString('base64'),
			mimeType: 'image/png',
		},
	};

	// Make api call
	let result;
	try {
		result = await model.generateContent([prompt, image]).catch((error) => {
			console.log(error);
			console.log('Retrying request');
			// Retry request
			model.generateContent([prompt, image]);
		});
	} catch (error) {
		console.log(error);
		throw error;
	}

	// Return response or error if blocked
	try {
		const response = result.response.text();
		return response;
	} catch (error) {
		console.log(error);

		if (error.response.promptFeedback?.blockReason == 'SAFETY') {
			let reply = 'Response was blocked because of safety reasons:\n```';
			for (const rating of error.response.promptFeedback.safetyRatings) {
				reply += `\n- ${rating.category}: ${rating.probability}`;
			}
			reply += '```';
			throw { text: reply };
		} else if (error.response.promptFeedback?.blockReason == 'OTHER') {
			// const reply = '## ' + error.message;
			const reply = '### Response was blocked due to OTHER reason.';
			throw { text: reply };
		}

		throw error;
	}
};

exports.safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
];

exports.generationConfig = {
	maxOutputTokens: 400,
};

// TODO: WIP Switching to REST API instead of Google gemini node module. Romove everything above later and use only functions below:
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL);

exports.fetchGemini = async (chatHistory, settings = {}) => {
	let model = 'gemini-1.5-flash';
	if (settings?.model) model = settings.model;

	// models: gemini-pro gemini-1.5-pro gemini-1.5-flash
	const API_URL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

	const data = {
		contents: [...chatHistory],
		safetySettings: [
			{
				category: 'HARM_CATEGORY_HARASSMENT',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_HATE_SPEECH',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
				threshold: 'BLOCK_NONE',
			},
		],
		generationConfig: {
			// 	temperature: 1,
		},
	};

	if (settings?.config?.temperature) data.generationConfig.temperature = settings.config.temperature;

	const requestOptions = {
		method: 'post',
		body: JSON.stringify(data),
		// agent: proxyAgent,
	};

	let proxyAgent;
	if (process.env.PROXY_URL) {
		proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL);
		requestOptions.agent = proxyAgent;
	}

	try {
		const response = await fetch(API_URL, requestOptions);
		const json = await response.json();

		// When API returned error code
		if (json.error) {
			throw new Error(json.error.message);
		}

		// When the prompt violates safety settings
		if (
			json?.promptFeedback?.blockReason === 'SAFETY' ||
			json?.candidates?.[0]?.finishReason === 'SAFETY'
		) {
			throw new Error('Response was blocked by Gemini due to safety reasons.');
		}

		// When chatbot cenzorship blocked response
		if (
			json?.candidates?.[0]?.finishReason === 'OTHER' ||
			json?.promptFeedback?.blockReason === 'OTHER'
		) {
			throw new Error('Despite disabling safety settings, your prompt still got blocked.');
		}

		// When there is no text in response
		if (!json?.candidates?.at(0)?.content?.parts?.at(0)?.text) {
			throw new Error('Unknown API Error.');
		}

		const answer = json.candidates[0].content.parts[0].text;

		return answer;
	} catch (error) {
		console.error(error.message);
		return { error: error.message };
	}
};
