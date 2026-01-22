# Регистрация Deep Link протокола vscode:// в Void Editor

## Обзор

Чтобы после оплаты ЮKassa мог вернуть пользователя обратно в Void через `vscode://iskra-ai/payment-success`, нужно зарегистрировать протокол в операционной системе.

## Windows

### Вариант 1: Через package.json (рекомендуется)

Файл: `package.json` в корне проекта Void

```json
{
  "name": "void",
  "productName": "Void",
  "build": {
    "appId": "com.void.editor",
    "protocols": {
      "name": "vscode-protocol",
      "schemes": ["vscode"]
    },
    "win": {
      "target": ["nsis"],
      "icon": "resources/win32/code.ico"
    }
  }
}
```

### Вариант 2: Через electron-builder.yml

Файл: `electron-builder.yml`

```yaml
appId: com.void.editor
productName: Void
protocols:
  - name: vscode-protocol
    schemes:
      - vscode
win:
  target: nsis
  icon: resources/win32/code.ico
```

### Вариант 3: Вручную через реестр Windows

Создай файл `register-protocol.reg`:

```reg
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\vscode]
@="URL:VSCode Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\vscode\DefaultIcon]
@="C:\\void\\void\\Void.exe,1"

[HKEY_CLASSES_ROOT\vscode\shell]

[HKEY_CLASSES_ROOT\vscode\shell\open]

[HKEY_CLASSES_ROOT\vscode\shell\open\command]
@="\"C:\\void\\void\\Void.exe\" \"%1\""
```

Запусти файл двойным кликом для регистрации.

## Обработка deep link в Electron

### Файл: `src/main.ts` или `src/vs/code/electron-main/main.ts`

```typescript
import { app, BrowserWindow } from 'electron';

// Регистрация протокола при запуске
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('vscode', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('vscode');
}

// Обработка deep link на Windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Кто-то пытался запустить второй экземпляр
    // commandLine содержит URL: vscode://iskra-ai/payment-success
    
    const url = commandLine.find(arg => arg.startsWith('vscode://'));
    if (url) {
      handleDeepLink(url);
    }
    
    // Фокус на главное окно
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Обработка при первом запуске (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

// Функция обработки deep link
function handleDeepLink(url: string) {
  console.log('Deep link received:', url);
  
  // Парсим URL: vscode://iskra-ai/payment-success
  const urlObj = new URL(url);
  const host = urlObj.host; // iskra-ai
  const path = urlObj.pathname; // /payment-success
  
  if (host === 'iskra-ai' && path === '/payment-success') {
    // Показываем уведомление
    const { Notification } = require('electron');
    const notification = new Notification({
      title: '✅ Оплата успешна!',
      body: 'Ваша подписка активирована',
      icon: 'resources/win32/code.ico'
    });
    notification.show();
    
    // Отправляем событие в renderer process
    if (mainWindow) {
      mainWindow.webContents.send('payment-success', {
        timestamp: Date.now()
      });
    }
    
    // Обновляем данные пользователя
    refreshUserData();
  }
}

// Обновление данных пользователя
async function refreshUserData() {
  // Получить токен из настроек
  const token = getAuthToken();
  
  // Запросить данные с сервера
  const response = await fetch('https://cli.cryptocatslab.ru/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const userData = await response.json();
  
  // Отправить в renderer
  if (mainWindow) {
    mainWindow.webContents.send('user-data-updated', userData);
  }
}
```

## Обработка в Renderer Process

### Файл: `src/vs/workbench/contrib/void/browser/voidService.ts`

```typescript
import { ipcRenderer } from 'electron';

// Слушаем событие успешной оплаты
ipcRenderer.on('payment-success', (event, data) => {
  console.log('Payment success received:', data);
  
  // Показываем уведомление в UI
  showNotification('Оплата успешна!', 'Ваша подписка активирована');
  
  // Обновляем UI
  refreshSubscriptionStatus();
});

// Слушаем обновление данных пользователя
ipcRenderer.on('user-data-updated', (event, userData) => {
  console.log('User data updated:', userData);
  
  // Обновляем отображение тарифа
  updateTierDisplay(userData.tier);
  updateRequestsLimit(userData.requests_today);
});
```

## Тестирование

### 1. Проверка регистрации протокола

**Windows:**
```cmd
# Открой командную строку и выполни:
start vscode://iskra-ai/payment-success
```

Должен открыться Void и сработать обработчик.

### 2. Проверка из браузера

Создай HTML файл `test-deeplink.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Deep Link</title>
</head>
<body>
    <h1>Test Void Deep Link</h1>
    <a href="vscode://iskra-ai/payment-success">
        Открыть Void (payment success)
    </a>
    
    <script>
        // Или программно
        function openVoid() {
            window.location.href = 'vscode://iskra-ai/payment-success';
        }
    </script>
    
    <button onclick="openVoid()">Открыть Void (JS)</button>
</body>
</html>
```

Открой файл в браузере и кликни на ссылку.

### 3. Логирование

Добавь логи в main.ts:

```typescript
app.on('second-instance', (event, commandLine) => {
  console.log('Second instance detected');
  console.log('Command line:', commandLine);
  
  const url = commandLine.find(arg => arg.startsWith('vscode://'));
  console.log('Deep link URL:', url);
});
```

Смотри логи в DevTools: **Help → Toggle Developer Tools → Console**

## Troubleshooting

### Протокол не работает

1. **Проверь регистрацию:**
   ```cmd
   reg query HKEY_CLASSES_ROOT\vscode
   ```

2. **Пересобери приложение:**
   ```bash
   yarn build
   ```

3. **Переустанови Void** (если используешь installer)

### Deep link не открывает Void

1. Убедись что Void запущен
2. Проверь что `app.requestSingleInstanceLock()` вызван
3. Посмотри логи в консоли

### Уведомление не показывается

1. Проверь что `handleDeepLink()` вызывается (добавь `console.log`)
2. Убедись что `mainWindow` существует
3. Проверь что `ipcRenderer.on()` зарегистрирован в renderer

## Альтернатива: Fallback на веб-страницу

Если deep link не работает, можно сделать гибридный подход:

```typescript
// В billing.ts
const returnUrl = req.body.returnUrl || 'https://cli.cryptocatslab.ru/payment-success';

// Страница payment-success.html
<script>
  // Пытаемся открыть Void
  window.location.href = 'vscode://iskra-ai/payment-success';
  
  // Если не сработало, показываем инструкцию
  setTimeout(() => {
    document.getElementById('manual-instruction').style.display = 'block';
  }, 2000);
</script>

<div id="manual-instruction" style="display: none;">
  <p>Если Void не открылся автоматически:</p>
  <ol>
    <li>Откройте Void Editor вручную</li>
    <li>Ваша подписка уже активирована</li>
  </ol>
</div>
```

## Полезные ссылки

- Electron Protocol Handler: https://www.electronjs.org/docs/latest/api/protocol
- Custom URI Schemes: https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app
