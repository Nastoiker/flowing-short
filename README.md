# Flowing Short

Сайт коротких видео: Next.js, NestJS, Prisma/SQLite и Kafka. Требуются Docker Compose **2.24.4+** и Node.js **22**. SQLite рассчитана на один экземпляр backend.

## Локальный запуск

```sh
node scripts/setup.mjs
docker compose up -d --build --wait
```

Сайт: http://localhost:3000. `setup.mjs` создаёт случайный JWT-секрет в игнорируемом `.env` и сохраняет существующий файл. Compose применяет миграции без сброса БД; данные, загруженные файлы и Kafka хранятся в постоянных томах. `docker compose down` сохраняет данные; **не используйте `down -v` для рабочего проекта**.

Для демонстрации с синтетическими данными используйте отдельный стек:

```sh
docker compose -p flowing-short-test -f compose.yaml -f compose.test.yaml up -d --build --wait
docker compose -p flowing-short-test -f compose.yaml -f compose.test.yaml exec -T backend npx prisma db seed
```

Сайт демо: http://localhost:13000, API: http://localhost:18000. Учётная запись `demo@example.test` / `DemoPassword123!`. Seed запускается только при явном разрешении в demo/test-базе, повторный запуск не создаёт дубли и не обновляет существующие записи. Почта и Telegram выключены по умолчанию; тесты не используют внешние аккаунты, платежи или production-данные.

## Бесплатная ссылка для клиента

На Windows откройте Docker Desktop и дважды нажмите `start-demo.cmd`. Скопируйте напечатанную HTTPS-ссылку клиенту. `stop-demo.cmd` закрывает публичный доступ. Аналогичные команды из терминала:

```sh
node scripts/demo.mjs start
node scripts/demo.mjs status
node scripts/demo.mjs stop
```

`start` поднимает отдельный проект `flowing-short-client-demo` с собственной БД, Kafka, загрузками и случайным секретом в игнорируемом `.runtime/demo.env`, повторно заполняет демо без дублей и выводит HTTPS-ссылку `trycloudflare.com`. Локальный адрес — http://localhost:13010. Демо-аккаунт: `demo@example.test` / `DemoPassword123!`. Ссылку можно отправить клиенту; доступ открыт любому, кто её знает. Не загружайте конфиденциальные материалы. `stop` закрывает публичный доступ, сохраняя данные. Повторный `start` при работающем tunnel сохраняет ссылку; после остановки tunnel будет новый адрес.

Это бесплатный временный показ с вашего компьютера, без аккаунта, домена и карты: компьютер, Docker и интернет должны работать, сон компьютера прерывает доступ. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) не гарантирует доступность и меняет адрес при новом запуске. Для постоянного адреса и независимости от компьютера потребуется отдельный хостинг. Стенд не участвует в тестах отказа CI. Видео в seed синтетическое — перед встречей добавьте свои разрешённые демонстрационные материалы.

## Проверки

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm run typecheck --prefix backend
npm run build --prefix backend
npm test --prefix backend -- --runInBand
npm run test:integration --prefix backend
npm run build --prefix frontend
npm run typecheck --prefix frontend
npx --prefix frontend playwright install chromium
```

Интеграционные тесты сами создают отдельную SQLite-базу. После запуска и seed тестового Compose:

```sh
# bash; в PowerShell: $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:13000'
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:13000
npm run test:e2e --prefix frontend
docker compose -p flowing-short-test -f compose.yaml -f compose.test.yaml exec -T -e API_URL=http://127.0.0.1:8000 backend node --test test/kafka.integration.cjs
export COMPOSE_PROJECT_NAME=flowing-short-test ALLOW_SYNTHETIC_TESTS=true API_URL=http://127.0.0.1:18000
node scripts/test-health.mjs
```

Последний тест временно ломает доступ к таблице тестовой SQLite и останавливает Kafka, проверяет HTTP 503, восстановление, доставку накопленного события и сохранность аккаунта после перезапуска. Он отказывается работать с другим Compose-проектом или рабочей БД. При аварийном завершении смотрите сообщения о восстановлении и `docker compose ... start kafka`.

На 31.10.2026 `npm audit --omit=dev`: frontend — 0 предупреждений; backend — 0 critical/high, 8 moderate в Nest 9/UUID. Обновление этих major-версий остаётся отдельной задачей. Runtime-образ не содержит TypeScript, Jest, ts-node и Nest CLI.

## Health checks и Kafka

Frontend: `/health/live`. Backend: `/health/live` отвечает при живом процессе; `/health/ready` проверяет прикладную таблицу SQLite и доступность Kafka topic, максимум 2 секунды на зависимость. При отказе возвращается 503 без адресов, исключений и секретов. Через сайт API доступен по `/api/health/ready`. Compose использует readiness для запуска зависимых контейнеров. Статус unhealthy виден в `docker compose ps`; сам Docker не перезапускает контейнер только из-за unhealthy.

Регистрация атомарно сохраняет пользователя и событие в outbox. Фоновый обработчик публикует `user.registered.v1` в `flowing.user.registered.v1`, ожидает подтверждение Kafka и повторяет попытки после отказа. Событие содержит ID, без email и пароля. Доставка **at-least-once**: downstream-потребитель должен дедуплицировать по `eventId`. Опубликованные записи пока сохраняются; политику очистки следует выбрать по сроку хранения аудита. Реальный consumer в интеграционном тесте подтверждает получение.

## GitHub Actions

На каждый push и pull request запускается `.github/workflows/ci.yml`. Сначала установка по lock-файлам, типы, сборки, unit/API-тесты. Затем отдельный Docker-стек, повторный seed, Chromium desktop/mobile, реальная доставка Kafka, отказ БД/брокера и восстановление. Логи, JSON-отчёты, Playwright HTML, screenshots и traces доступны во вкладке **Actions → запуск → Artifacts** (7 дней). CI удаляет только свои временные тома. В настройках защиты `main` включите обязательность обоих jobs перед merge.

## Сервер

Автоматического деплоя и подключённого сервера в репозитории нет. На сервере с Docker/Compose клонируйте **коммит с успешным CI**, выполните локальные команды запуска выше. Добавьте HTTPS reverse proxy перед `127.0.0.1:3000`, настройте домен, резервное копирование SQLite/загрузок и мониторинг health. Секрет `.env` создавайте на сервере; не копируйте тестовые пароли и данные. Для восстановления БД проверяйте резервную копию, не запускайте reset миграций.

Compose — конфигурация одного сервера, не отказоустойчивый кластер: один Kafka broker, SQLite и локальные тома. Для нескольких экземпляров потребуется миграция СУБД и outbox-worker coordination; для Kafka HA — несколько брокеров, replication и TLS/SASL. Наружу Kafka и backend в обычном Compose не опубликованы. Приложение ещё использует часть устаревших зависимостей; это подготовленный и проверяемый запуск, не полный аудит безопасности. Ранее отслеживаемые `.env`/БД удалены из текущего дерева, но остаются в истории Git: ранее использовавшиеся реальные секреты необходимо заменить.
