import { sleep } from 'k6';
import { createClient } from './helpers/openaiGeneric.js';

// Test configuration
export const options = {
  vus: 5,                  // Number of virtual users
  duration: '60s',         // Test duration
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
  },
};

const client = createClient({
  // use environment variable or defaults from openaiGeneric.js
});

export default function () {
  // Send a chat completion request
  const response = client.chatComplete({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' }
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  // Check if the response is valid
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      
      // Check if the response has the expected structure
      if (body && body.choices && body.choices.length > 0 && 
          body.choices[0].message && body.choices[0].message.content) {
        console.log(`Response: ${body.choices[0].message.content.substring(0, 50)}...`); // Log just first 50 chars
      } else {
        // Only log details about missing response structure if debug is enabled
        if (__ENV.DEBUG === 'true') {
          console.log(`Unexpected response structure: ${JSON.stringify(body).substring(0, 100)}...`);
        }
      }
    } catch (e) {
      console.error(`Error parsing response: ${e.message}`);
    }
  } else {
    console.error(`Error: ${response.status} - ${response.body}`);
  }

  // Add some random sleep to simulate user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}