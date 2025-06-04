import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics
export const promptTokens = new Trend('prompt_tokens');
export const completionTokens = new Trend('completion_tokens');
export const totalTokens = new Trend('total_tokens');
export const tokensPerSecond = new Trend('tokens_per_second');

export function createClient(config) {
  const baseConfig = {
    url: __ENV.OPENAI_URL || 'http://localhost:8000',  // Use env var or default
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_KEY || 'sk-1234'}`, // Use env var or default
    },
    options: {
      model: __ENV.MODEL_NAME || 'DeepSeek-R1', // Use env var or default
    },
  };

  const mergedConfig = {
    ...baseConfig,
    ...config,
    headers: {
      ...baseConfig.headers,
      ...(config.headers || {}),
    },
    options: {
      ...baseConfig.options,
      ...(config.options || {}),
    },
  };

  return {
    chatComplete(params) {
      const startTime = new Date();
      
      const requestData = {
        model: mergedConfig.options.model,
        messages: params.messages || [{ role: 'user', content: 'Hello' }],
        temperature: params.temperature || mergedConfig.options.temperature || 0.7,
        max_tokens: params.max_tokens || mergedConfig.options.max_tokens || 500,
        ...params,
      };

      const response = http.post(
        `${mergedConfig.url}/v1/chat/completions`,
        JSON.stringify(requestData),
        { headers: mergedConfig.headers }
      );

      const endTime = new Date();
      const duration = (endTime - startTime) / 1000; // in seconds

      check(response, {
        'is status 200': (r) => r.status === 200,
        'has valid JSON response': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body !== null;
          } catch (e) {
            console.error('Error parsing JSON:', e);
            return false;
          }
        },
      });

      if (response.status === 200) {
        const body = JSON.parse(response.body);
        
        // Record token metrics if available
        if (body.usage) {
          promptTokens.add(body.usage.prompt_tokens);
          completionTokens.add(body.usage.completion_tokens);
          totalTokens.add(body.usage.total_tokens);
          
          // Calculate tokens per second
          if (body.usage.completion_tokens > 0 && duration > 0) {
            tokensPerSecond.add(body.usage.completion_tokens / duration);
          }
        }
      }

      return response;
    },

    embed(params) {
      const requestData = {
        model: mergedConfig.options.model,
        input: params.input || ['Hello world'],
        ...params,
      };

      const response = http.post(
        `${mergedConfig.url}/v1/embeddings`,
        JSON.stringify(requestData),
        { headers: mergedConfig.headers }
      );

      check(response, {
        'is status 200': (r) => r.status === 200,
        'has valid JSON response': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body !== null;
          } catch (e) {
            console.error('Error parsing JSON:', e);
            return false;
          }
        },
      });

      return response;
    }
  };
}