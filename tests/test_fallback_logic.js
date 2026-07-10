import { sp4LlmCall } from '../src/llm/llmRouter.js';

// Mock job for testing
const mockJob = {
  prompt: 'Testovací prompt pre fallback logiku.',
  system: 'Testovací systémový prompt.',
  model: 'llama3',
};

describe('Fallback Logic Tests', () => {
  test('Primary model succeeds', async () => {
    const result = await sp4LlmCall(mockJob);
    expect(result.ok).toBe(true);
    expect(result.engine).toBe('llama3');
  });

  test('Fallback model is used when primary fails', async () => {
    // Simulate primary model failure
    mockJob.model = 'nonexistent-model';
    const result = await sp4LlmCall(mockJob);
    expect(result.ok).toBe(true);
    expect(result.engine).toBe('deepseek');
  });

  test('Both models fail', async () => {
    // Simulate both models failing
    mockJob.model = 'nonexistent-model';
    const result = await sp4LlmCall({ ...mockJob, prompt: 'Invalid prompt' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Local engines failed');
  });
});