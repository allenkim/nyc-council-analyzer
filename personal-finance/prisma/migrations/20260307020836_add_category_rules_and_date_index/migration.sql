-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantPattern" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CategoryRule_merchantPattern_idx" ON "CategoryRule"("merchantPattern");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
