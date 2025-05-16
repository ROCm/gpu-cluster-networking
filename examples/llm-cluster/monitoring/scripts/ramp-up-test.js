import { sleep } from 'k6';
import { createClient } from './helpers/openaiGeneric.js';

// Test configuration with ramping VUs
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 VUs in 30 seconds
    { duration: '1m', target: 5 },    // Stay at 5 VUs for 1 minute
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs in 30 seconds
    { duration: '1m', target: 10 },   // Stay at 10 VUs for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs in 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests should be below 10s
    http_req_failed: ['rate<0.05'],     // Less than 5% of requests should fail
  },
};

const client = createClient({
  // use environment variable or defaults from openaiGeneric.js
});

export default function () {
  // Generate a randomized request
  const prompts = [
    'What is the capital of France?',
    'Explain quantum computing in simple terms.',
    'Write a short poem about the ocean.',
    'Discuss the benefits of regular exercise.',
    'What are the main features of Python?',
  ];
  
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  
  // Send a chat completion request
  const response = client.chatComplete({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  // Sleep between 2-5 seconds to simulate user behavior
  sleep(Math.random() * 3 + 2);
}