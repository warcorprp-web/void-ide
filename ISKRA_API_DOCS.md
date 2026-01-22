# Искра API - OpenAI-совместимый формат

## 🔗 Endpoint

```
https://cli.cryptocatslab.ru/ai/v1/chat/completions
```

## 🔑 Авторизация

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Токен получается через регистрацию:
1. POST /auth/send-code - отправить код на email
2. POST /auth/verify-email - подтвердить код
3. POST /auth/complete-registration - получить JWT токен

## 📊 Доступные модели

### Qwen (Alibaba) - для кода
- `qwen3-coder-flash` - быстрая (рекомендуется)
- `qwen3-coder-plus` - мощная

### Claude (Anthropic) - универсальные
- `claude-haiku-4-5` - быстрая
- `claude-sonnet-4-5` - сбалансированная
- `claude-sonnet-4-5-20250929` - улучшенная
- `claude-sonnet-4-20250514` - стабильная
- `claude-3-7-sonnet-20250219` - продвинутая

## 📝 Формат запроса (OpenAI-совместимый)

### Простой запрос

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder-flash",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### С инструментами (tools)

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder-plus",
    "messages": [
      {"role": "user", "content": "Create file test.py with hello world"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "create_file_or_folder",
          "description": "Create a file or folder",
          "parameters": {
            "type": "object",
            "properties": {
              "uri": {
                "type": "string",
                "description": "File path"
              }
            },
            "required": ["uri"]
          }
        }
      }
    ]
  }'
```

### Со стримингом

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [
      {"role": "user", "content": "Write a Python function"}
    ],
    "stream": true
  }'
```

## 📤 Формат ответа

### Обычный ответ

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen3-coder-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Ответ с tool call

```json
{
  "id": "chatcmpl-456",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen3-coder-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "create_file_or_folder",
              "arguments": "{\"uri\":\"/test.py\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 10,
    "total_tokens": 60
  }
}
```

### Streaming ответ

```
data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1677652288,"model":"claude-sonnet-4-5","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1677652288,"model":"claude-sonnet-4-5","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1677652288,"model":"claude-sonnet-4-5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## 🛠️ Использование с OpenAI SDK

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://cli.cryptocatslab.ru/ai/v1",
    api_key="YOUR_JWT_TOKEN"
)

response = client.chat.completions.create(
    model="qwen3-coder-flash",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://cli.cryptocatslab.ru/ai/v1',
  apiKey: 'YOUR_JWT_TOKEN',
  dangerouslyAllowBrowser: true // только для браузера
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-5',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

### Node.js

```javascript
const OpenAI = require('openai');

const client = new OpenAI({
  baseURL: 'https://cli.cryptocatslab.ru/ai/v1',
  apiKey: 'YOUR_JWT_TOKEN'
});

async function main() {
  const response = await client.chat.completions.create({
    model: 'qwen3-coder-plus',
    messages: [
      { role: 'user', content: 'Write a function' }
    ]
  });
  
  console.log(response.choices[0].message.content);
}

main();
```

## 🔧 Параметры запроса

| Параметр | Тип | Описание | Обязательный |
|----------|-----|----------|--------------|
| `model` | string | ID модели | ✅ Да |
| `messages` | array | Массив сообщений | ✅ Да |
| `stream` | boolean | Включить стриминг | ❌ Нет (default: false) |
| `tools` | array | Список инструментов | ❌ Нет |
| `temperature` | number | 0.0 - 2.0 | ❌ Нет (default: 0.7) |
| `max_tokens` | number | Макс токенов ответа | ❌ Нет |
| `top_p` | number | 0.0 - 1.0 | ❌ Нет (default: 1.0) |

## 📊 Лимиты

| Tier | Запросов/день | Цена |
|------|---------------|------|
| Free | 20 | Бесплатно |
| Pro | 500 | 990₽/мес |
| Pro+ | 2000 | 1990₽/мес |

## 🔍 Проверка статистики

```bash
curl https://cli.cryptocatslab.ru/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Ответ:
```json
{
  "user": {
    "email": "user@example.com",
    "tier": "free"
  },
  "usage": {
    "requestsToday": 5,
    "tokensToday": 1250,
    "limit": 20,
    "remaining": 15
  }
}
```

## ⚠️ Коды ошибок

| Код | Описание |
|-----|----------|
| 401 | Неправильный токен |
| 429 | Лимит запросов исчерпан |
| 400 | Неправильный запрос |
| 500 | Ошибка сервера |

## 💡 Примеры использования

### 1. Генерация кода

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder-plus",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful coding assistant"
      },
      {
        "role": "user",
        "content": "Write a Python function to calculate fibonacci"
      }
    ]
  }'
```

### 2. Чат с историей

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [
      {"role": "user", "content": "What is 2+2?"},
      {"role": "assistant", "content": "2+2 equals 4."},
      {"role": "user", "content": "What about 3+3?"}
    ]
  }'
```

### 3. С инструментами (полный пример)

```bash
curl -X POST https://cli.cryptocatslab.ru/ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder-plus",
    "messages": [
      {"role": "user", "content": "Read file config.json"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "read_file",
          "description": "Read contents of a file",
          "parameters": {
            "type": "object",
            "properties": {
              "uri": {
                "type": "string",
                "description": "Path to the file"
              }
            },
            "required": ["uri"]
          }
        }
      }
    ]
  }'
```

## 🎯 Особенности

1. **Полная совместимость с OpenAI API** - можно использовать официальные SDK
2. **Поддержка function calling** - все модели поддерживают tools
3. **Streaming** - все модели поддерживают потоковую передачу
4. **Автоматический подсчет токенов** - в каждом ответе
5. **Лимиты по тарифам** - автоматическая проверка перед запросом

## 📚 Дополнительная документация

- **Авторизация:** https://paste.rs/RrC2V
- **Полная документация API:** https://paste.rs/Qfv9o
- **OpenAI-совместимость:** https://paste.rs/I0TQ1

## 🆘 Поддержка

Email: iskra@cryptocatslab.ru
API: https://cli.cryptocatslab.ru
