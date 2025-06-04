import { sleep } from 'k6';
import { createClient } from './helpers/openaiGeneric.js';

// Test configuration for stress testing
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 VUs in 1 minute
    { duration: '3m', target: 10 },  // Stay at 10 VUs for 3 minutes
    { duration: '2m', target: 20 },  // Ramp up to 20 VUs in 2 minutes
    { duration: '3m', target: 20 },  // Stay at 20 VUs for 3 minutes
    { duration: '2m', target: 30 },  // Ramp up to 30 VUs in 2 minutes
    { duration: '3m', target: 30 },  // Stay at 30 VUs for 3 minutes
    { duration: '1m', target: 0 },   // Ramp down to 0 VUs in 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000'], // 95% of requests should be below 15s
    http_req_failed: ['rate<0.1'],      // Less than 10% of requests should fail
  },
};

// Complex prompts that require more computation
const complexPrompts = [
  'Write a detailed summary of the key events in World War II and their impact on global politics.',
  'Explain quantum mechanics, including the double-slit experiment, wave-particle duality, and Heisenberg\'s uncertainty principle.',
  'Compare and contrast the economic systems of capitalism, socialism, and communism with detailed examples.',
  'Describe the process of photosynthesis in plants, including all chemical reactions and energy transfers.',
  'Analyze the themes and literary devices in Shakespeare\'s "Hamlet" and their relevance today.',
];

const client = createClient({
  // use environment variable or defaults from openaiGeneric.js
});

export default function () {
  // Select a random complex prompt
  const prompt = complexPrompts[Math.floor(Math.random() * complexPrompts.length)];
  
  // Send a chat completion request with higher token limits for stress testing
  const response = client.chatComplete({
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Provide detailed and comprehensive responses.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 500,  // Larger response size to stress the system
    temperature: 0.7,
  });

  // Minimal sleep to maximize load
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
}