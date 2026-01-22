# Инструкция по оплате через ЮKassa в Iskra API

## Обзор

Iskra API использует ЮKassa (YooMoney) для приёма платежей за подписки Pro и Pro+.

## Тарифы

- **Pro**: 990 ₽/месяц
  - 500 запросов в день
  
- **Pro+**: 1990 ₽/месяц
  - 2000 запросов в день

## Настройка

### 1. Переменные окружения (.env)

```env
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
```

Получить в личном кабинете ЮKassa: https://yookassa.ru/my/shop/settings

### 2. Webhook URL

Настроить в ЮKassa webhook на URL:
```
https://cli.cryptocatslab.ru/billing/webhook
```

## API Endpoints

### 1. Создать платёж

**POST** `/billing/create`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "tier": "pro"  // или "pro_plus"
}
```

**Response:**
```json
{
  "paymentId": "2d8e8e8e-0001-5000-8000-1234567890ab",
  "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
  "amount": 990,
  "currency": "RUB"
}
```

**Действия:**
1. Создаёт платёж в ЮKassa
2. Сохраняет запись в таблице `subscriptions` со статусом `pending`
3. Возвращает URL для оплаты

**Пример curl:**
```bash
curl -X POST https://cli.cryptocatslab.ru/billing/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'
```

### 2. Проверить статус платежа

**GET** `/billing/status/:paymentId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "status": "succeeded",
  "paid": true,
  "amount": "990.00"
}
```

**Возможные статусы:**
- `pending` - ожидает оплаты
- `waiting_for_capture` - деньги заблокированы
- `succeeded` - оплачено успешно
- `canceled` - отменён

**Пример curl:**
```bash
curl https://cli.cryptocatslab.ru/billing/status/2d8e8e8e-0001-5000-8000-1234567890ab \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Webhook (для ЮKassa)

**POST** `/billing/webhook`

Автоматически вызывается ЮKassa при изменении статуса платежа.

**Обработка:**
1. Получает уведомление от ЮKassa
2. Если `status === 'succeeded'` и `paid === true`:
   - Обновляет `subscriptions.status` → `active`
   - Устанавливает `expires_at` → NOW() + 30 дней
   - Обновляет `users.tier` → выбранный тариф
3. Возвращает `200 OK`

## Процесс оплаты (Flow)

### Шаг 1: Пользователь выбирает тариф
```
Void Editor → POST /billing/create → Получает confirmationUrl
```

### Шаг 2: Открывается страница оплаты
```
Браузер → confirmationUrl → Форма оплаты ЮKassa
```

### Шаг 3: Пользователь оплачивает
```
ЮKassa → Обрабатывает платёж → Отправляет webhook
```

### Шаг 4: Webhook активирует подписку
```
POST /billing/webhook → Обновляет БД → Подписка активна
```

### Шаг 5: Редирект обратно
```
ЮKassa → vscode://iskra-ai/payment-success → Void Editor
```

## Структура БД

### Таблица `subscriptions`

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50),  -- pending, active, canceled
  tier VARCHAR(50),    -- pro, pro_plus
  stripe_subscription_id VARCHAR(255),  -- ID платежа ЮKassa
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица `users`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  tier VARCHAR(50) DEFAULT 'free',  -- free, pro, pro_plus
  ...
);
```

## Тестирование

### 1. Тестовые карты ЮKassa

**Успешная оплата:**
```
Номер: 5555 5555 5555 4477
Срок: 12/24
CVC: 123
3DS: 12345678
```

**Отклонённая оплата:**
```
Номер: 5555 5555 5555 5599
```

### 2. Проверка webhook локально

```bash
curl -X POST http://localhost:3322/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.succeeded",
    "object": {
      "id": "test-payment-id",
      "status": "succeeded",
      "paid": true,
      "amount": {"value": "990.00", "currency": "RUB"},
      "metadata": {
        "user_id": "1",
        "tier": "pro"
      }
    }
  }'
```

## Безопасность

1. **Webhook подпись**: ЮKassa не отправляет подпись в webhook, проверяйте IP адреса отправителя
2. **HTTPS**: Webhook URL должен быть HTTPS
3. **Идемпотентность**: Обрабатывайте дубликаты webhook (проверяйте `payment_id`)

## Мониторинг

### Логи платежей
```bash
pm2 logs iskra-api | grep -i "payment\|yookassa"
```

### Проверка активных подписок
```sql
SELECT u.email, s.tier, s.status, s.expires_at 
FROM subscriptions s 
JOIN users u ON s.user_id = u.id 
WHERE s.status = 'active';
```

## Troubleshooting

### Webhook не приходит
1. Проверьте URL в настройках ЮKassa
2. Убедитесь что сервер доступен извне
3. Проверьте логи: `pm2 logs iskra-api`

### Платёж успешен, но подписка не активна
1. Проверьте логи webhook
2. Проверьте `metadata` в платеже (должны быть `user_id` и `tier`)
3. Вручную обновите БД:
```sql
UPDATE subscriptions 
SET status = 'active', expires_at = NOW() + INTERVAL '30 days'
WHERE stripe_subscription_id = 'PAYMENT_ID';

UPDATE users SET tier = 'pro' WHERE id = USER_ID;
```

### Ошибка "Failed to create payment"
1. Проверьте `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`
2. Убедитесь что магазин активен в ЮKassa
3. Проверьте баланс и лимиты

## Полезные ссылки

- Документация ЮKassa API: https://yookassa.ru/developers/api
- Личный кабинет: https://yookassa.ru/my
- Тестовые данные: https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing
