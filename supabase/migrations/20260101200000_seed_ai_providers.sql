-- Seed initial AI providers
INSERT INTO public.ai_providers (provider_code, name, base_url, is_active, is_default, default_model, available_models)
VALUES 
  (
    'openai', 
    'OpenAI', 
    'https://api.openai.com/v1', 
    true, 
    true, 
    'gpt-4o', 
    '[
      {"id": "gpt-4o", "name": "GPT-4o", "context_window": 128000, "supports_vision": true},
      {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "context_window": 128000, "supports_vision": true},
      {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context_window": 128000, "supports_vision": true}
    ]'::jsonb
  ),
  (
    'anthropic', 
    'Anthropic', 
    'https://api.anthropic.com/v1/messages', 
    true, 
    false, 
    'claude-3-5-sonnet-20240620', 
    '[
      {"id": "claude-3-5-sonnet-20240620", "name": "Claude 3.5 Sonnet", "context_window": 200000, "supports_vision": true},
      {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "context_window": 200000, "supports_vision": true},
      {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "context_window": 200000, "supports_vision": true},
      {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "context_window": 200000, "supports_vision": true}
    ]'::jsonb
  ),
  (
    'google', 
    'Google Gemini', 
    'https://generativelanguage.googleapis.com/v1beta/models', 
    true, 
    false, 
    'gemini-1.5-pro', 
    '[
      {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "context_window": 1000000, "supports_vision": true},
      {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "context_window": 1000000, "supports_vision": true}
    ]'::jsonb
  ),
  (
    'perplexity',
    'Perplexity',
    'https://api.perplexity.ai',
    true,
    false,
    'llama-3-sonar-large-32k-online',
    '[
      {"id": "llama-3-sonar-large-32k-online", "name": "Llama 3 Large Online", "context_window": 32000, "supports_vision": false},
      {"id": "llama-3-sonar-small-32k-online", "name": "Llama 3 Small Online", "context_window": 32000, "supports_vision": false}
    ]'::jsonb
  ),
  (
    'deepseek',
    'DeepSeek',
    'https://api.deepseek.com',
    true,
    false,
    'deepseek-coder',
    '[
      {"id": "deepseek-coder", "name": "DeepSeek Coder", "context_window": 32000, "supports_vision": false},
      {"id": "deepseek-chat", "name": "DeepSeek Chat", "context_window": 32000, "supports_vision": false}
    ]'::jsonb
  )
ON CONFLICT (provider_code) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  default_model = EXCLUDED.default_model,
  available_models = EXCLUDED.available_models
WHERE ai_providers.provider_code = EXCLUDED.provider_code;
