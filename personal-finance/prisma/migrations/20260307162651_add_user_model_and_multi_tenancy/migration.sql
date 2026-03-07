/*
  Warnings:

  - Added the required column `snapTradeUserId` to the `SnapTradeConnection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "plaidItemId" TEXT,
    "plaidAccountId" TEXT,
    "snapTradeConnectionId" TEXT,
    "snapTradeAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Account_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Account_snapTradeConnectionId_fkey" FOREIGN KEY ("snapTradeConnectionId") REFERENCES "SnapTradeConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("createdAt", "id", "institution", "name", "plaidAccountId", "plaidItemId", "snapTradeAccountId", "snapTradeConnectionId", "type", "updatedAt") SELECT "createdAt", "id", "institution", "name", "plaidAccountId", "plaidItemId", "snapTradeAccountId", "snapTradeConnectionId", "type", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE TABLE "new_Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" DATETIME,
    "isAutoPay" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bill" ("amount", "category", "createdAt", "dueDay", "id", "isAutoPay", "isPaid", "name", "notes", "paidDate", "updatedAt") SELECT "amount", "category", "createdAt", "dueDay", "id", "isAutoPay", "isPaid", "name", "notes", "paidDate", "updatedAt" FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE INDEX "Bill_userId_idx" ON "Bill"("userId");
CREATE TABLE "new_BudgetGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "limit" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BudgetGoal" ("category", "createdAt", "id", "limit", "updatedAt") SELECT "category", "createdAt", "id", "limit", "updatedAt" FROM "BudgetGoal";
DROP TABLE "BudgetGoal";
ALTER TABLE "new_BudgetGoal" RENAME TO "BudgetGoal";
CREATE INDEX "BudgetGoal_userId_idx" ON "BudgetGoal"("userId");
CREATE UNIQUE INDEX "BudgetGoal_userId_category_key" ON "BudgetGoal"("userId", "category");
CREATE TABLE "new_CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "merchantPattern" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CategoryRule" ("category", "createdAt", "id", "matchType", "merchantPattern", "priority") SELECT "category", "createdAt", "id", "matchType", "merchantPattern", "priority" FROM "CategoryRule";
DROP TABLE "CategoryRule";
ALTER TABLE "new_CategoryRule" RENAME TO "CategoryRule";
CREATE INDEX "CategoryRule_merchantPattern_idx" ON "CategoryRule"("merchantPattern");
CREATE INDEX "CategoryRule_userId_idx" ON "CategoryRule"("userId");
CREATE TABLE "new_CreditScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreditScore" ("createdAt", "id", "score", "source") SELECT "createdAt", "id", "score", "source" FROM "CreditScore";
DROP TABLE "CreditScore";
ALTER TABLE "new_CreditScore" RENAME TO "CreditScore";
CREATE INDEX "CreditScore_userId_idx" ON "CreditScore"("userId");
CREATE TABLE "new_FinancialGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialGoal" ("category", "createdAt", "currentAmount", "id", "name", "targetAmount", "targetDate", "updatedAt") SELECT "category", "createdAt", "currentAmount", "id", "name", "targetAmount", "targetDate", "updatedAt" FROM "FinancialGoal";
DROP TABLE "FinancialGoal";
ALTER TABLE "new_FinancialGoal" RENAME TO "FinancialGoal";
CREATE INDEX "FinancialGoal_userId_idx" ON "FinancialGoal"("userId");
CREATE TABLE "new_Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Insight" ("createdAt", "data", "id", "isRead", "message", "severity", "title", "type") SELECT "createdAt", "data", "id", "isRead", "message", "severity", "title", "type" FROM "Insight";
DROP TABLE "Insight";
ALTER TABLE "new_Insight" RENAME TO "Insight";
CREATE INDEX "Insight_userId_idx" ON "Insight"("userId");
CREATE TABLE "new_PlaidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "itemId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "transactionsCursor" TEXT,
    "lastSynced" DATETIME,
    "lastTransactionSync" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlaidItem" ("accessToken", "createdAt", "id", "institution", "itemId", "lastSynced", "lastTransactionSync", "transactionsCursor", "updatedAt") SELECT "accessToken", "createdAt", "id", "institution", "itemId", "lastSynced", "lastTransactionSync", "transactionsCursor", "updatedAt" FROM "PlaidItem";
DROP TABLE "PlaidItem";
ALTER TABLE "new_PlaidItem" RENAME TO "PlaidItem";
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");
CREATE TABLE "new_SnapTradeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "snapTradeUserId" TEXT NOT NULL,
    "userSecret" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "lastSynced" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SnapTradeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SnapTradeConnection" ("authorizationId", "createdAt", "id", "institution", "lastSynced", "updatedAt", "userId", "userSecret") SELECT "authorizationId", "createdAt", "id", "institution", "lastSynced", "updatedAt", "userId", "userSecret" FROM "SnapTradeConnection";
DROP TABLE "SnapTradeConnection";
ALTER TABLE "new_SnapTradeConnection" RENAME TO "SnapTradeConnection";
CREATE UNIQUE INDEX "SnapTradeConnection_authorizationId_key" ON "SnapTradeConnection"("authorizationId");
CREATE INDEX "SnapTradeConnection_userId_idx" ON "SnapTradeConnection"("userId");
CREATE TABLE "new_Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "netWorth" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Snapshot" ("createdAt", "id", "netWorth") SELECT "createdAt", "id", "netWorth" FROM "Snapshot";
DROP TABLE "Snapshot";
ALTER TABLE "new_Snapshot" RENAME TO "Snapshot";
CREATE INDEX "Snapshot_userId_idx" ON "Snapshot"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
