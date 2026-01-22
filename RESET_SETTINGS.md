# Сброс настроек Void для отображения Искра моделей

Если модели Искра не отображаются после обновления, нужно сбросить настройки:

## Способ 1: Через Developer Tools

1. Откройте Void
2. Help → Toggle Developer Tools (или F12)
3. Перейдите в Console
4. Выполните:

```javascript
// Удалить старые настройки
localStorage.removeItem('void.settingsServiceStorageII');

// Перезагрузить окно
location.reload();
```

## Способ 2: Через файловую систему

Удалите файл настроек вручную:

**Windows:**
```
%APPDATA%\Void\User\globalStorage\storage.json
```

**macOS:**
```
~/Library/Application Support/Void/User/globalStorage/storage.json
```

**Linux:**
```
~/.config/Void/User/globalStorage/storage.json
```

После удаления перезапустите Void.

## Способ 3: Через команду Void

1. Откройте Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Введите: `Developer: Reload Window`
3. Если не помогло, попробуйте Способ 1

## Проверка

После сброса настроек:

1. Откройте боковой чат (Cmd+L / Ctrl+L)
2. Кликните на dropdown с моделями
3. Вы должны увидеть:
   - **Искра | Anthropic** (5 моделей Claude)
   - **Искра | Alibaba** (2 модели Qwen)

## Если все еще не работает

Проверьте в Developer Tools Console:

```javascript
// Проверить что провайдеры зарегистрированы
console.log(Object.keys(defaultProviderSettings));
// Должно включать: 'ceillerClaude', 'ceillerQwen'

// Проверить что модели есть
console.log(defaultModelsOfProvider.ceillerClaude);
console.log(defaultModelsOfProvider.ceillerQwen);
```
