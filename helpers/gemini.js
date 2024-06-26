const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Prepares a prompt object with an image, ready to be sent as an API request.
 *
 * @param {string} text - The text content of the prompt.
 * @param {object} attachment - An object containing attachment information.
 * @returns {Promise<object>} A promise resolving to an object containing the prompt and base64 encoded image, ready for API request.
 */
exports.prepareImagePrompt = async (text, attachment) => {
	// Check image type
	const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
	if (!allowedImageTypes.includes(attachment.contentType)) {
		return {
			error: 'File type not supported. (Allowed file types: **.png, .jpg, .webp, .heic, .heif**)',
		};
	}

	// Check image size. Max 20 MB for enire request so I let 12 MB for image because of base64 conversion rate
	const maxImageSize = 1024 * 1024 * 12;
	if (Number(attachment.size) > maxImageSize) {
		return { error: 'File too big. (Max file size is **12 MB**)' };
	}

	// Donwnload image to buffer
	let buffer;
	try {
		const response = await fetch(attachment.url);
		buffer = await response.arrayBuffer();
	} catch (error) {
		console.log(error);
		return { error: 'Failed to download image.' };
	}

	// Prepare prompt
	const prompt = [
		{
			parts: [
				{
					text: text,
				},
				{
					inlineData: {
						data: Buffer.from(buffer).toString('base64'),
						mimeType: attachment.contentType,
					},
				},
			],
		},
	];

	return prompt;
};

/**
 * Executes a request to the Gemini API with the provided chat history and settings.
 *
 * @async
 * @param {Array<Object>} chatHistory - An array of objects representing the chat history.
 * @param {Object} [settings={}] - An object containing settings for the API.
 * @param {number} [settings.maxOutputTokens] - Maximum number of tokens in response.
 * @param {number} [settings.temperature=1.0] - A temperature value between 0.0 and 2.0. Defaults to 1.0.
 *                                            This controls the creativity of the response (higher values are more creative).
 * @param {string} [settings.model="gemini-1.5-flash"] - The name of the model to use. Defaults to "gemini-1.5-flash".
 * @returns {Promise<string|Object>} - A Promise that resolves to either the response from the Gemini API
 *                                     as a string or an object with an "error" key containing the error description.
 */
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
		generationConfig: {},
	};

	// Parse generationConfig settings
	if (settings?.config?.maxOutputTokens) {
		data.generationConfig.maxOutputTokens = settings.config.maxOutputTokens;
	}
	if (settings?.config?.temperature) {
		data.generationConfig.temperature = settings.config.temperature;
	}

	const requestOptions = {
		method: 'post',
		body: JSON.stringify(data),
	};

	// Use proxy for API call if proxy ip set in .env file
	let proxyAgent;
	if (process.env.PROXY_URL) {
		proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL);
		requestOptions.agent = proxyAgent;
	}

	let response, json;

	try {
		response = await fetch(API_URL, requestOptions);
		json = await response.json();
	} catch (error) {
		console.error(error.message);
		return { error: 'Request to Gemini API failed.' };
	}

	try {
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
