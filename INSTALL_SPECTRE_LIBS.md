# Установка библиотек Spectre для сборки Void

## Ошибка
```
error MSB8040: для этого проекта требуются библиотеки с устранением рисков Spectre
```

## Решение

1. **Открыть Visual Studio Installer**
   - Найти в меню Пуск "Visual Studio Installer"
   - Или запустить: `C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe`

2. **Нажать "Изменить" (Modify) для Visual Studio 2022 Community**

3. **Перейти на вкладку "Отдельные компоненты" (Individual Components)**

4. **Найти и установить следующие компоненты:**
   
   В поиске введите "Spectre" и отметьте:
   
   - ✅ `MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)`
   - ✅ `C++ ATL for latest v143 build tools with Spectre Mitigations (x86 & x64)`
   - ✅ `C++ MFC for latest v143 build tools with Spectre Mitigations (x86 & x64)`

5. **Нажать "Изменить" (Modify) внизу справа**

6. **Дождаться установки** (может занять 5-10 минут)

7. **После установки вернуться в терминал и запустить:**
   ```bash
   npm install
   ```

## Альтернатива (если не хочется устанавливать Spectre)

Можно попробовать собрать без remote компонентов:
```bash
npm run gulp vscode-win32-x64 -- --skip-remote
```

Но это может привести к отсутствию некоторых функций удаленной разработки.
