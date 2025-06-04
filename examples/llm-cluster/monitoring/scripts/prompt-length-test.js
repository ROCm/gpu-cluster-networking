import { sleep } from 'k6';
import { createClient, promptTokens } from './helpers/openaiGeneric.js';
import { Trend } from 'k6/metrics';

// Custom metrics for tracking response time by prompt length
const shortPromptResponseTime = new Trend('short_prompt_response_time');
const mediumPromptResponseTime = new Trend('medium_prompt_response_time');
const longPromptResponseTime = new Trend('long_prompt_response_time');

// Test configuration
export const options = {
  vus: 3,                  // One VU for each prompt length category
  iterations: 15,          // 5 iterations per VU (5 for each prompt length)
  thresholds: {
    http_req_duration: ['p(90)<10000'], // 90% of requests should be below 10s
  },
};

// Define prompts of different lengths
const shortPrompt = 'What is the capital of France?';

const mediumPrompt = `
Explain the basic principles of machine learning and how it differs from traditional programming.
Provide a brief overview of supervised, unsupervised, and reinforcement learning.
`;

const longPrompt = `
I'm writing a research paper on climate change and need comprehensive information on the following aspects:
1. The primary greenhouse gases and their sources, both natural and anthropogenic
2. Current global temperature trends and predictions for the next 50-100 years
3. Potential impacts on ecosystems, agriculture, and human settlements
4. International policy frameworks such as the Paris Agreement and their effectiveness
5. Technological solutions being developed or deployed to mitigate climate change
6. Economic considerations including carbon pricing, green investments, and transition costs
7. Ethical dimensions including intergenerational justice and responsibilities of developed nations
8. Adaptation strategies for vulnerable communities and infrastructure

For each point, please provide evidence-based information with consideration of different perspectives.
`;

const client = createClient({
  // use environment variable or defaults from openaiGeneric.js
});

export default function () {
  // Use __VU to determine which prompt to use (VU 1 = short, VU 2 = medium, VU 3 = long)
  let prompt;
  let responseTimeTrend;
  
  switch (__VU % 3) {
    case 1:
      prompt = shortPrompt;
      responseTimeTrend = shortPromptResponseTime;
      break;
    case 2:
      prompt = mediumPrompt;
      responseTimeTrend = mediumPromptResponseTime;
      break;
    default:
      prompt = longPrompt;
      responseTimeTrend = longPromptResponseTime;
      break;
  }
  
  // Start timing
  const startTime = new Date();
  
  // Send request
  const response = client.chatComplete({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.7,
  });
  
  // End timing and record response time
  const endTime = new Date();
  const responseTime = endTime - startTime;
  
  // Add response time to appropriate trend
  responseTimeTrend.add(responseTime);
  
  // Sleep between requests
  sleep(3);
}