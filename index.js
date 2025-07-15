import dotenv from 'dotenv'
dotenv.config()
import buildScenes from './heygen_scene_script.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import readline from 'readline';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("What's your topic to Generate Video ? ", (topic) => {
    generateQA(topic)
    .then(async scenes => {
        console.log(scenes)
        console.log(`Successfully generated ${scenes.length} Q&A pairs about ${topic}:`);
        await buildScenes(scenes)
        console.log(JSON.stringify(scenes, null, 2)); // Pretty print the JSON
    })
    .catch(error => {
        console.error("An error occurred during Q&A generation:", error);
    });

    rl.close();
});


/**
 * Generates a list of question-and-answer pairs about a given topic using the Gemini API.
 * @param {string} topic - The topic for which to generate Q&A pairs.
 * @returns {Promise<Array<{q: string, a: string}>>} - A promise that resolves to an array of Q&A objects.
 */
async function generateQA(topic) {
    const prompt = `
You are an expert educator.
Generate exactly 25 question-and-answer pairs about "${topic}".
Return the output as a JSON array of objects with keys "avatarName" and "script".

Example:
[
  { avatarName: "Thessia", script: "What is ... " },
  { avatarName: "Auron", script: "Answer ... "}
]

Do not include markdown formatting like \`\`\`json in your response. Just return the raw JSON array.
`;

    try {
        // 1. Get the generative model object
        // Note: Using a stable, recent model like "gemini-1.5-pro-latest".
        // "gemini-2.5-pro" is not a recognized model name.
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 2. Call generateContent on the model object
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("API response did not contain expected text content.");
        }

        // 3. Parse the JSON response
        let qaList;
        try {
            // The model output should be clean JSON now, but trimming is still good practice.
            qaList = JSON.parse(text.trim());
        } catch (jsonErr) {
            console.error("Parsing error: The model did not return valid JSON.", jsonErr);
            console.error("Raw response text:", text);
            throw new Error("Failed to parse JSON from API response.");
        }

        // Your validation check is good practice!
        if (!Array.isArray(qaList) || !qaList.every(item => typeof item === 'object' && item !== null && 'q' in item && 'a' in item)) {
            console.warn("Warning: The generated JSON might not perfectly match the expected structure.");
        }

        return qaList;
    } catch (apiError) {
        console.error("Error calling Google GenAI API:", apiError);
        throw new Error(`Failed to generate QA for topic "${topic}". Details: ${apiError.message}`);
    }
}


