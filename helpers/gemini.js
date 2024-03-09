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
		model: 'gemini-pro-vision',
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
