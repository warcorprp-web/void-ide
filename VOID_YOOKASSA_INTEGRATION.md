# Инструкция: Подключение оплаты ЮKassa в Void Editor

## Обзор

Интеграция системы оплаты подписок Pro и Pro+ через ЮKassa в Void Editor.

## Тарифы

- **Pro**: 990 ₽/месяц - 500 запросов в день
- **Pro+**: 1990 ₽/месяц - 2000 запросов в день

## Шаг 1: Добавить UI для выбора тарифа

### Файл: `src/vs/workbench/contrib/void/browser/react/components/SubscriptionPanel.tsx`

```tsx
import React, { useState } from 'react';

interface Tier {
  id: 'pro' | 'pro_plus';
  name: string;
  price: number;
  requests: number;
}

const TIERS: Tier[] = [
  { id: 'pro', name: 'Pro', price: 990, requests: 500 },
  { id: 'pro_plus', name: 'Pro+', price: 1990, requests: 2000 }
];

export const SubscriptionPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (tier: 'pro' | 'pro_plus') => {
    setLoading(true);
    
    try {
      // Получаем токен из настроек
      const token = await getAuthToken();
      
      // Создаём платёж
      const response = await fetch('https://cli.cryptocatslab.ru/billing/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();
      
      if (data.confirmationUrl) {
        // Открываем браузер для оплаты
        window.open(data.confirmationUrl, '_blank');
        
        // Начинаем проверять статус
        checkPaymentStatus(data.paymentId, token);
      }
      
    } catch (err) {
      console.error('Payment error:', err);
      alert('Ошибка создания платежа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-panel">
      <h2>Выберите подписку</h2>
      
      {TIERS.map(tier => (
        <div key={tier.id} className="tier-card">
          <h3>{tier.name}</h3>
          <p className="price">{tier.price} ₽/месяц</p>
          <p className="requests">{tier.requests} запросов в день</p>
          <button 
            onClick={() => handleSubscribe(tier.id)}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Оформить'}
          </button>
        </div>
      ))}
    </div>
  );
};

// Проверка статуса платежа каждые 3 секунды
async function checkPaymentStatus(paymentId: string, token: string) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        `https://cli.cryptocatslab.ru/billing/status/${paymentId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await response.json();
      
      if (data.status === 'succeeded' && data.paid) {
        clearInterval(interval);
        alert('✅ Оплата успешна! Подписка активирована.');
        // Обновить UI
        window.location.reload();
      }
      
      if (data.status === 'canceled') {
        clearInterval(interval);
        alert('❌ Платёж отменён');
      }
      
    } catch (err) {
      console.error('Check status error:', err);
    }
  }, 3000);
  
  // Остановить через 5 минут
  setTimeout(() => clearInterval(interval), 300000);
}

// Получить токен из настроек Void
async function getAuthToken(): Promise<string> {
  // Токен хранится в настройках провайдера
  const settings = getProviderSettings('ceillerClaude'); // или ceillerQwen
  return settings.apiKey; // Это JWT токен пользователя
}
```

## Шаг 2: Добавить кнопку в настройки

### Файл: `src/vs/workbench/contrib/void/browser/react/components/SettingsPanel.tsx`

Добавить кнопку "Управление подпиской":

```tsx
import { SubscriptionPanel } from './SubscriptionPanel';

// В компоненте настроек:
<button onClick={() => openSubscriptionPanel()}>
  💳 Управление подпиской
</button>
```

## Шаг 3: Показать текущий тариф

### Файл: `src/vs/workbench/contrib/void/browser/react/components/UserInfo.tsx`

```tsx
import React, { useEffect, useState } from 'react';

export const UserInfo: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const token = await getAuthToken();
    
    const response = await fetch('https://cli.cryptocatslab.ru/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    setUserData(data);
  };

  if (!userData) return <div>Загрузка...</div>;

  return (
    <div className="user-info">
      <p>Email: {userData.email}</p>
      <p>Тариф: {getTierName(userData.tier)}</p>
      <p>Запросов сегодня: {userData.requests_today} / {getTierLimit(userData.tier)}</p>
    </div>
  );
};

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    'free': 'Free',
    'pro': 'Pro',
    'pro_plus': 'Pro+'
  };
  return names[tier] || tier;
}

function getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    'free': 10,
    'pro': 500,
    'pro_plus': 2000
  };
  return limits[tier] || 0;
}
```

## Шаг 4: Обработка deep link после оплаты

### Файл: `src/vs/workbench/contrib/void/electron-main/deepLink.ts`

```typescript
// Регистрация обработчика vscode://iskra-ai/payment-success
app.on('open-url', (event, url) => {
  event.preventDefault();
  
  if (url.startsWith('vscode://iskra-ai/payment-success')) {
    // Показать уведомление
    const notification = new Notification({
      title: 'Оплата успешна!',
      body: 'Ваша подписка активирована',
      icon: path.join(__dirname, 'resources/icon.png')
    });
    notification.show();
    
    // Обновить данные пользователя
    mainWindow.webContents.send('payment-success');
  }
});
```

## Шаг 5: CSS стили

### Файл: `src/vs/workbench/contrib/void/browser/react/styles/subscription.css`

```css
.subscription-panel {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.subscription-panel h2 {
  text-align: center;
  margin-bottom: 30px;
}

.tier-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background: var(--vscode-editor-background);
}

.tier-card h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.tier-card .price {
  font-size: 32px;
  font-weight: bold;
  color: var(--vscode-textLink-foreground);
  margin: 10px 0;
}

.tier-card .requests {
  color: var(--vscode-descriptionForeground);
  margin-bottom: 20px;
}

.tier-card button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.tier-card button:hover {
  background: var(--vscode-button-hoverBackground);
}

.tier-card button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-info {
  padding: 15px;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-info p {
  margin: 5px 0;
}
```

## Шаг 6: Добавить в меню

### Файл: `src/vs/workbench/contrib/void/browser/void.contribution.ts`

```typescript
// Добавить команду в меню
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
  command: {
    id: 'void.openSubscription',
    title: 'Iskra: Управление подпиской',
    category: 'Iskra AI'
  }
});

// Регистрация команды
CommandsRegistry.registerCommand('void.openSubscription', () => {
  // Открыть панель подписки
  openSubscriptionPanel();
});
```

## Процесс оплаты (User Flow)

1. **Пользователь открывает настройки** → Видит кнопку "Управление подпиской"
2. **Выбирает тариф** → Нажимает "Оформить"
3. **Открывается браузер** → Форма оплаты ЮKassa
4. **Вводит данные карты** → Оплачивает
5. **Редирект обратно** → `vscode://iskra-ai/payment-success`
6. **Void показывает уведомление** → "Оплата успешна!"
7. **Автоматическое обновление** → Новый тариф активен

## Тестирование

### Тестовая карта ЮKassa

```
Номер: 5555 5555 5555 4477
Срок: 12/24
CVC: 123
3DS код: 12345678
```

### Проверка в DevTools

```javascript
// Открыть консоль в Void (Help → Toggle Developer Tools)

// Создать тестовый платёж
fetch('https://cli.cryptocatslab.ru/billing/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ tier: 'pro' })
})
.then(r => r.json())
.then(console.log);

// Проверить статус
fetch('https://cli.cryptocatslab.ru/billing/status/PAYMENT_ID', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(console.log);
```

## Troubleshooting

### Кнопка не работает
- Проверь что токен сохранён в настройках
- Открой DevTools и посмотри ошибки в консоли

### Браузер не открывается
- Проверь что `confirmationUrl` получен от API
- Убедись что `window.open()` не заблокирован

### Статус не обновляется
- Проверь что webhook настроен в ЮKassa
- Посмотри логи сервера: `pm2 logs iskra-api`

### Deep link не работает
- Убедись что протокол `vscode://` зарегистрирован
- Проверь обработчик `app.on('open-url')`

## Дополнительно

### Отмена подписки

```tsx
const handleCancel = async () => {
  const token = await getAuthToken();
  
  await fetch('https://cli.cryptocatslab.ru/billing/cancel', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  alert('Подписка отменена');
};
```

### История платежей

```tsx
const loadPaymentHistory = async () => {
  const token = await getAuthToken();
  
  const response = await fetch('https://cli.cryptocatslab.ru/billing/history', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const payments = await response.json();
  return payments;
};
```

## Полезные ссылки

- API документация: `/root/iskra/YOOKASSA_PAYMENT_GUIDE.md`
- Тестовые данные ЮKassa: https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing
