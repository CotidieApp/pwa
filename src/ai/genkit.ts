
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// This initializes Genkit with the Google AI plugin.
// The plugin will automatically look for the GEMINI_API_KEY in your environment variables.
// Make sure to add your key to the .env file.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
