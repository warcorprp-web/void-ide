# Интеграция Искра API

Этот документ описывает интеграцию API Искра в форк Void IDE.

## Обзор

Искра API предоставляет доступ к AI моделям (Claude от Anthropic и Qwen от Alibaba) с системой аутентификации и биллинга.

**Base URL:** `https://cli.cryptocatslab.ru`

## Реализованные компоненты

### 1. Backend сервис (`iskraApiService.ts`)

Расположение: `void/src/vs/workbench/contrib/void/common/iskraApiService.ts`

Сервис предоставляет:
- Аутентификацию (регистрация, вход, подтверждение email)
- Отправку запросов к AI моделям (Qwen и Claude)
- Управление биллингом (создание платежей, проверка статуса)
- Получение списка доступных моделей

### 2. Провайдеры AI моделей

#### Ceiller Claude (`ceillerClaude`)
- Модели: claude-haiku-4-5, claude-sonnet-4-5, claude-3-7-sonnet-20250219
- Endpoint: `https://cli.cryptocatslab.ru/ai/claude`
- Поддержка reasoning с budget slider

#### Ceiller Qwen (`ceillerQwen`)
- Модели: qwen3-coder-plus, qwen3-coder-flash
- Endpoint: `https://cli.cryptocatslab.ru/ai/qwen`
- OpenAI-совместимый формат

### 3. UI компоненты

#### IskraAuth (`IskraAuth.tsx`)
Компонент для аутентификации с поддержкой:
- Входа в систему
- Регистрации нового пользователя
- Подтверждения email кодом
- Повторной отправки кода

#### IskraProfile (`IskraProfile.tsx`)
Компонент профиля пользователя с:
- Информацией о тарифе
- Отображением использованных запросов
- Возможностью обновления тарифа
- Кнопкой выхода

#### Settings (`Settings.tsx`)
Обновленный компонент настроек, интегрирующий аутентификацию и профиль.

## Тарифные планы

### Free (Бесплатный)
- 20 запросов в день
- Доступ к Qwen Flash и Claude Haiku
- Email верификация обязательна

### Pro (990₽/месяц)
- 500 запросов в день
- Доступ ко всем моделям
- Приоритетная поддержка

### Pro+ (1990₽/месяц)
- 2000 запросов в день
- Доступ ко всем моделям
- Максимальный приоритет

## Использование

### Настройка провайдеров

Провайдеры `ceillerClaude` и `ceillerQwen` предустановлены с API ключом `879621` и готовы к использованию после аутентификации пользователя.

### Аутентификация

1. Пользователь открывает настройки Void
2. Видит форму входа/регистрации
3. После успешной аутентификации получает доступ к моделям
4. Токен сохраняется в localStorage

### Отправка запросов

Запросы к AI моделям автоматически используют токен из `iskraApiService`:

```typescript
// Для Claude
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  messages: [...],
  // Токен добавляется автоматически через defaultHeaders
});

// Для Qwen (OpenAI-совместимый)
const response = await openai.chat.completions.create({
  model: 'qwen3-coder-flash',
  messages: [...],
  // Токен добавляется автоматически через defaultHeaders
});
```

### Биллинг

Для обновления тарифа:

```typescript
const payment = await iskraApiService.createPayment('pro', returnUrl);
// Открываем confirmationUrl для оплаты
window.open(payment.confirmationUrl, '_blank');
```

## Файлы, затронутые интеграцией

1. **Backend:**
   - `void/src/vs/workbench/contrib/void/common/iskraApiService.ts` - сервис API
   - `void/src/vs/workbench/contrib/void/common/modelCapabilities.ts` - определения моделей
   - `void/src/vs/workbench/contrib/void/common/voidSettingsTypes.ts` - типы настроек
   - `void/src/vs/workbench/contrib/void/electron-main/llmMessage/sendLLMMessage.impl.ts` - отправка сообщений

2. **Frontend:**
   - `void/src/vs/workbench/contrib/void/browser/react/src/void-settings-tsx/Settings.tsx` - главный компонент
   - `void/src/vs/workbench/contrib/void/browser/react/src/void-settings-tsx/IskraAuth.tsx` - аутентификация
   - `void/src/vs/workbench/contrib/void/browser/react/src/void-settings-tsx/IskraProfile.tsx` - профиль

3. **Документация:**
   - `void/backend-api-docs.txt` - полная документация API
   - `void/ISKRA_API_INTEGRATION.md` - этот файл

## Следующие шаги

1. **Интеграция с IskraApiService:** Заменить прямые fetch вызовы в Settings.tsx на использование IskraApiService
2. **Отображение лимитов:** Добавить реальное отображение использованных запросов из API
3. **Обработка ошибок:** Улучшить обработку ошибок и показ уведомлений
4. **Автообновление токена:** Добавить автоматическое обновление токена при истечении
5. **Webhook обработка:** Добавить обработку webhook от ЮKassa для автоматического обновления тарифа

## Поддержка

Email: iskra@cryptocatslab.ru
