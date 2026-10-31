CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "aggregateId" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" DATETIME
);
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");
