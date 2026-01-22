# Исправление: Qwen модели не вызывали инструменты

## Проблема
Qwen модели (`qwen3-coder-plus`, `qwen3-coder-flash`) останавливались с `finishReason: 'length'` перед вызовом инструментов, в то время как Claude модели работали идеально.

## Причина
Qwen модели упирались в лимит токенов (по умолчанию ~2048) перед тем, как успеть сгенерировать `tool_calls`. Claude модели имеют более эффективную генерацию и успевали вызвать инструменты в рамках дефолтного лимита.

## Решение
Добавлен параметр `max_tokens` при наличии инструментов:
- **Qwen модели**: `max_tokens = 8192` (увеличенный лимит для tool calling)
- **Другие модели**: `max_tokens = 4096` (стандартный лимит)

## Изменения в коде
Файл: `void/src/vs/workbench/contrib/void/electron-main/llmMessage/sendLLMMessage.impl.ts`

```typescript
// Отключаем streaming если есть tools (streaming может некорректно работать с tool_calls)
if (nativeToolsObj.tools && nativeToolsObj.tools.length > 0) {
    (options as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming).stream = false;
    // Увеличиваем max_tokens для Qwen моделей, чтобы они успели вызвать инструменты
    // Qwen модели часто упираются в лимит токенов перед вызовом tool_calls
    if (providerName === 'ceillerQwen') {
        (options as any).max_tokens = 8192; // Увеличенный лимит для tool calling
        console.log('[Iskra] Set max_tokens=8192 for Qwen with tools');
    } else {
        (options as any).max_tokens = 4096; // Стандартный лимит для других моделей
    }
    console.log('[Iskra] Disabled streaming because tools are present');
}
```

## Результат
Теперь Qwen модели должны успешно вызывать инструменты без остановки по лимиту токенов.

## Тестирование
1. Перезапустите Void Editor
2. Попробуйте использовать Qwen модель с инструментами (например, попросите прочитать файл)
3. В логах должно появиться: `[Iskra] Set max_tokens=8192 for Qwen with tools`
4. Модель должна успешно вызвать инструмент с `finishReason: 'tool_calls'` вместо `'length'`

## Дополнительные улучшения
- Обновлено debug логирование для отображения `max_tokens` в логах
- Теперь можно видеть, какой лимит токенов используется для каждого запроса
