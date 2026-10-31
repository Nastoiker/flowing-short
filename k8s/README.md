# Kubernetes: изолированный проверяемый стенд

Требуются Docker **28+**, Node.js 22, `kubectl`, Windows/Linux x64 и около 3 ГБ свободной RAM для нового кластера и приложений. Скрипт загружает **kind 0.33.0** из официального источника, проверяет закреплённый SHA256 и использует закреплённый образ Kubernetes 1.35.8. Образы передаются single-platform архивами, чтобы работать и с containerd image store Docker Desktop. Доступ к платному облаку не нужен.

```sh
node scripts/k8s.mjs start
node scripts/k8s.mjs test
node scripts/k8s.mjs serve
# http://127.0.0.1:13020; Ctrl+C закрывает только port-forward
node scripts/k8s.mjs status
node scripts/k8s.mjs diagnostics
node scripts/k8s.mjs stop
```

Стенд живёт только в kind-кластере `flowing-short-review`, namespace `flowing-short`. Скрипт всегда задаёт отдельный kubeconfig `.runtime/k8s/kubeconfig` и `--context kind-flowing-short-review`: текущий kubectl context, другие кластеры, Compose и клиентский tunnel не меняются. Случайный JWT-секрет хранится в игнорируемом `.runtime/k8s/secret.json` и Kubernetes Secret; при повторном запуске не меняется. Секрет передаётся kubectl через stdin, не через аргументы CLI.

`start` собирает образы, загружает их в kind, применяет манифесты, ждёт readiness и добавляет синтетический seed без удаления/обновления существующих данных. Backend выполняет миграции перед запуском. Init container идемпотентно создаёт Kafka topic. Повторный запуск обновляет приложение с сохранением PVC. Обновление SQLite backend может дать короткий перерыв — здесь нет обещания zero downtime.

`test` проверяет frontend и API через Service DNS, реальную доставку Kafka, повторный seed. Затем временно масштабирует **только свой Kafka StatefulSet** до 0, проверяет HTTP 503 при живом backend и исключение backend из Service endpoints, возвращает Kafka и проверяет восстановление. После этого удаляет **только backend pod** и проверяет сохранность строк БД, загруженного файла и UID PVC после восстановления pod. Это отдельная demo-БД, не production. `stop` удаляет **весь выделенный кластер с его демо-томами**; обычное пересоздание pod данные сохраняет. Диагностика сохраняется в `test-results/kubernetes/`, не в Git.

## Устройство

- Frontend: Deployment, ClusterIP Service, HTTP startup/liveness/readiness.
- Backend: **один** StatefulSet pod, отдельные PVC для SQLite и uploads. Liveness не зависит от Kafka; readiness проверяет БД и брокер с ограниченными таймаутами. Не увеличивайте replicas при SQLite и текущем outbox worker.
- Kafka: один StatefulSet broker/controller с PVC; topic `flowing.user.registered.v1`, replication factor 1. Данные переживают замену pod, но это не HA-кластер.
- Namespace включает Kubernetes Pod Security `restricted`: контейнеры без root/privilege escalation, без ServiceAccount token, с seccomp и сброшенными Linux capabilities. Приложения имеют read-only root filesystem и отдельные writable volumes; Kafka создаёт конфигурацию внутри своего образа и требует writable root filesystem.
- Заданы requests/limits; суммарные application requests около 0.6 CPU / 896 MiB RAM, limits до 1.9 GiB RAM плюс control-plane. Стандартный kind local-path provisioner обеспечивает PVC только внутри Docker-хоста.

## Перенос на серверный кластер

Манифесты можно получить через `kubectl kustomize k8s`. Перед реальным развёртыванием необходимо задать собственные immutable image references (например, kustomize `images`), StorageClass/размеры дисков, Kubernetes Secret, DNS/TLS и существующий ingress controller. `ingress.example.yaml` не включён по умолчанию и ничего не публикует наружу. Frontend собирается с `API_INTERNAL_URL=http://backend:8000`.

Для HA сначала переносите SQLite в серверную СУБД, обеспечивайте координацию outbox workers, используйте Kafka с несколькими брокерами/replication и TLS/SASL. Нужны резервные копии, восстановление и сетевые политики под выбранный CNI. Этот локальный стенд не выдаётся за работающий хостинг и не заменяет клиентское Compose-демо.

CI вызывает `.github/workflows/kubernetes.yml` после основных проверок. Он создаёт отдельный kind на временном GitHub runner, проверяет HTTP/Kafka/PVC, сохраняет диагностические артефакты и удаляет только свой кластер.

Основания: [kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/), [StatefulSet и хранилище](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/), [HTTP probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/), [SecurityContext](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/).
