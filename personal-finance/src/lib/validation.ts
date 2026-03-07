import { z } from "zod";
import { ACCOUNT_TYPES, ASSET_CATEGORIES } from "@/lib/categories";

// --- Budgets ---

export const createBudgetSchema = z.object({
  category: z.string().min(1),
  limit: z.number().positive(),
});

// --- Bills ---

export const createBillSchema = z.object({
  name: z.string().min(1),
  amount: z.number(),
  dueDay: z.number().int().min(1).max(31),
  category: z.string().min(1),
  isAutoPay: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const updateBillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  amount: z.number().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  category: z.string().min(1).optional(),
  isAutoPay: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// --- Insights ---

export const updateInsightSchema = z.object({
  id: z.string().min(1),
  isRead: z.boolean().optional(),
});

// --- Accounts ---

export const createAccountSchema = z.object({
  name: z.string().min(1),
  institution: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
});

// --- Credit Score ---

export const createCreditScoreSchema = z.object({
  score: z.number().int().min(300).max(850),
  source: z.string().optional(),
});

// --- Holdings ---

export const createHoldingSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(ASSET_CATEGORIES),
  quantity: z.number(),
  price: z.number(),
  ticker: z.string().optional().nullable(),
  costBasisPrice: z.number().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
});

export const updateHoldingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(ASSET_CATEGORIES),
  quantity: z.number(),
  price: z.number(),
  ticker: z.string().optional().nullable(),
});

// --- Goals ---

export const createGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const updateGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

// --- Transactions ---

export const transactionQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  accountId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  sortBy: z.enum(["date", "amount", "name", "category"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// --- Category Rules ---

export const createCategoryRuleSchema = z.object({
  merchantPattern: z.string().min(1),
  matchType: z.enum(["contains", "startsWith", "exact"]).default("contains"),
  category: z.string().min(1),
  priority: z.number().int().default(0),
});

export const updateCategoryRuleSchema = z.object({
  id: z.string().min(1),
  merchantPattern: z.string().min(1).optional(),
  matchType: z.enum(["contains", "startsWith", "exact"]).optional(),
  category: z.string().min(1).optional(),
  priority: z.number().int().optional(),
});

// --- Cost Basis ---

export const createCostBasisSchema = z.object({
  holdingId: z.string().min(1),
  purchaseDate: z.string().min(1),
  purchasePrice: z.number().positive(),
  quantity: z.number().positive(),
});

// --- Plaid ---

export const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1),
  institutionName: z.string().optional(),
});

export const plaidSyncTransactionsSchema = z.object({
  plaidItemId: z.string().optional(),
});

export const plaidSyncSchema = z.object({
  plaidItemId: z.string().optional(),
});

// --- SnapTrade ---

export const snapTradeCallbackSchema = z.object({
  authorizationId: z.string().min(1),
  userId: z.string().min(1),
  userSecret: z.string().min(1),
});

export const snapTradeSyncSchema = z.object({
  snapTradeConnectionId: z.string().optional(),
});

// --- User Profile ---

export const createProfileSchema = z.object({
  age: z.number().int().min(13).max(120),
  annualIncome: z.number().min(0),
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
  filingStatus: z.enum(["SINGLE", "MARRIED_FILING_JOINTLY", "MARRIED_FILING_SEPARATELY", "HEAD_OF_HOUSEHOLD"]).optional().nullable(),
  employmentType: z.enum(["W2", "SELF_EMPLOYED_1099", "RETIRED", "STUDENT", "OTHER"]).optional().nullable(),
  stateOfResidence: z.string().optional().nullable(),
  employer401kMatch: z.string().optional().nullable(),
  dependents: z.number().int().min(0).optional().nullable(),
  isHomeowner: z.boolean().optional().nullable(),
  monthlyTakeHome: z.number().min(0).optional().nullable(),
});

// --- Advisor ---

export const dismissRecommendationSchema = z.object({
  id: z.string().min(1),
});
