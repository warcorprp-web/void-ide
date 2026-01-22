# Полная сборка Void Production Installer

## Шаг 1: Применить все патчи

### 1.1 Исправить deviceId
Файл: `C:\void\void\src\vs\workbench\contrib\void\common\iskraApiService.ts`

Строка 307-309:
```typescript
private async generateDeviceId(): Promise<string> {
    try {
        const { getMachineId } = await import('vs/base/node/id');
        const machineId = await getMachineId((err) => console.error('Device ID error:', err));
        return machineId;
    } catch (err) {
        console.error('Failed to get machine ID:', err);
        return `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
}
```

Строка 176:
```typescript
const deviceId = this.storageService.get('iskra.deviceId', StorageScope.APPLICATION) || await this.generateDeviceId();
```

### 1.2 Исправить onFinalMessage (если еще не применено)
Файл: `C:\void\void\src\vs\workbench\contrib\void\electron-main\llmMessage\sendLLMMessage.impl.ts`

После строки ~520 добавить `return;` после `onFinalMessage()`.

### 1.3 Проверить max_tokens (опционально)
Файл: `C:\void\void\src\vs\workbench\contrib\void\electron-main\llmMessage\sendLLMMessage.impl.ts`

Строка ~432 - раскомментировать если нужно:
```typescript
max_completion_tokens: 8192
```

## Шаг 2: Обновить метаданные

### 2.1 package.json
Файл: `C:\void\void\package.json`

```json
{
  "name": "void",
  "version": "1.0.0",
  "productName": "Void",
  "description": "AI-powered code editor with Iskra integration",
  "main": "./out/main.js",
  "author": {
    "name": "Iskra AI"
  },
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/void"
  },
  "build": {
    "appId": "com.iskra.void",
    "productName": "Void",
    "protocols": {
      "name": "vscode-protocol",
      "schemes": ["vscode"]
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "resources/win32/code.ico",
      "artifactName": "Void-Setup-${version}.exe",
      "publisherName": "Iskra AI"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Void",
      "perMachine": false,
      "deleteAppDataOnUninstall": false
    },
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.developer-tools",
      "icon": "resources/darwin/code.icns",
      "darkModeSupport": true,
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "resources/darwin/entitlements.plist",
      "entitlementsInherit": "resources/darwin/entitlements.plist"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Development",
      "icon": "resources/linux/code.png",
      "maintainer": "Iskra AI"
    }
  }
}
```

### 2.2 product.json
Файл: `C:\void\void\product.json`

```json
{
  "nameShort": "Void",
  "nameLong": "Void",
  "applicationName": "void",
  "dataFolderName": ".void",
  "win32MutexName": "voidmutex",
  "licenseName": "Apache-2.0",
  "licenseUrl": "https://github.com/yourusername/void/blob/main/LICENSE.txt",
  "win32DirName": "Void",
  "win32NameVersion": "Void",
  "win32RegValueName": "Void",
  "win32AppId": "{{E5A2E8F0-8C8E-4F5E-9E5E-5E5E5E5E5E5E}}",
  "win32x64AppId": "{{E5A2E8F0-8C8E-4F5E-9E5E-5E5E5E5E5E5E}}",
  "win32UserAppId": "{{E5A2E8F0-8C8E-4F5E-9E5E-5E5E5E5E5E5F}}",
  "urlProtocol": "vscode",
  "extensionAllowedProposedApi": [],
  "builtInExtensions": []
}
```

## Шаг 3: Очистить и подготовить

```powershell
# Открой PowerShell в C:\void\void

# Очистить старые сборки
Remove-Item -Recurse -Force .build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .build-electron -ErrorAction SilentlyContinue

# Убедиться что все зависимости установлены
yarn install
```

## Шаг 4: Собрать production

```powershell
# Установить переменные окружения
$env:NODE_ENV = "production"
$env:VSCODE_QUALITY = "stable"

# Собрать TypeScript
yarn gulp compile-build

# Минифицировать и оптимизировать
yarn gulp minify-vscode

# Собрать Electron приложение
yarn gulp vscode-win32-x64
```

## Шаг 5: Создать installer

### Вариант A: NSIS Installer (рекомендуется)

```powershell
# Установить electron-builder если еще нет
npm install -g electron-builder

# Создать NSIS installer
electron-builder --win --x64 --config electron-builder.json
```

Создай файл `electron-builder.json`:
```json
{
  "appId": "com.iskra.void",
  "productName": "Void",
  "directories": {
    "output": "dist",
    "buildResources": "resources"
  },
  "files": [
    "out/**/*",
    "node_modules/**/*",
    "package.json",
    "product.json"
  ],
  "win": {
    "target": "nsis",
    "icon": "resources/win32/code.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Void",
    "installerIcon": "resources/win32/code.ico",
    "uninstallerIcon": "resources/win32/code.ico",
    "installerHeaderIcon": "resources/win32/code.ico",
    "perMachine": false,
    "deleteAppDataOnUninstall": false,
    "runAfterFinish": true,
    "license": "LICENSE.txt"
  }
}
```

### Вариант B: Gulp task (если есть)

```powershell
# Использовать встроенный gulp task
yarn gulp vscode-win32-x64-inno-updater
```

## Шаг 6: Найти готовый installer

После сборки installer будет в одной из папок:

```powershell
# Проверь эти папки:
dir dist\*.exe
dir .build\win32-x64\*.exe
dir out\*.exe
```

Файл будет называться примерно так:
- `Void-Setup-1.0.0.exe`
- `VoidSetup.exe`
- `void-1.0.0-setup.exe`

## Шаг 7: Тестирование installer

```powershell
# Запусти installer
.\dist\Void-Setup-1.0.0.exe

# Проверь что:
# 1. Установка проходит без ошибок
# 2. Создается ярлык на рабочем столе
# 3. Приложение запускается
# 4. Регистрация работает с правильным deviceId
# 5. Deep link vscode:// работает
# 6. Оплата через ЮKassa работает
```

## Шаг 8: Подписать installer (опционально, для production)

Если у тебя есть сертификат:

```powershell
# Установить Windows SDK для signtool
# Скачать с: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

# Подписать
signtool sign /f "certificate.pfx" /p "password" /t http://timestamp.digicert.com /fd SHA256 "dist\Void-Setup-1.0.0.exe"

# Проверить подпись
signtool verify /pa "dist\Void-Setup-1.0.0.exe"
```

## Шаг 9: Создать portable версию (опционально)

```powershell
# Создать ZIP архив
yarn gulp vscode-win32-x64-archive

# Найти архив
dir .build\win32-x64\archive\*.zip
```

## Troubleshooting

### Ошибка: "Cannot find module"
```powershell
yarn install --force
yarn gulp clean
yarn gulp compile-build
```

### Ошибка: "Out of memory"
```powershell
$env:NODE_OPTIONS = "--max-old-space-size=8192"
yarn gulp compile-build
```

### Ошибка: "electron-builder not found"
```powershell
npm install -g electron-builder
# или
yarn global add electron-builder
```

### Installer не создается
Проверь что установлены:
- Node.js 18+
- Python 3.x
- Visual Studio Build Tools
- NSIS (для Windows installer)

## Финальная проверка

После создания installer проверь:

1. **Размер файла:** ~150-300 MB (нормально для Electron приложения)
2. **Иконка:** Должна быть твой logo.png
3. **Версия:** 1.0.0 в свойствах файла
4. **Подпись:** (если подписывал) Должна быть валидная
5. **Установка:** Проходит без ошибок
6. **Запуск:** Приложение открывается
7. **Функционал:** Все работает (регистрация, AI, оплата)

## Готовый installer

Финальный файл будет:
```
dist/Void-Setup-1.0.0.exe
```

Размер: ~200-300 MB
Можно распространять пользователям!

## Автообновление (для будущих версий)

Настрой сервер обновлений:
```json
// product.json
{
  "updateUrl": "https://cli.cryptocatslab.ru/updates",
  "quality": "stable",
  "commit": "1.0.0"
}
```

Создай endpoint на сервере:
```
GET /updates/win32/x64/stable/latest
```

Возвращает:
```json
{
  "url": "https://cli.cryptocatslab.ru/downloads/Void-Setup-1.0.1.exe",
  "name": "1.0.1",
  "version": "1.0.1",
  "releaseDate": "2026-01-22"
}
```
