import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transactionQuerySchema } from "@/lib/validation";
import { getUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = transactionQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      search, category, accountId, dateFrom, dateTo,
      amountMin, amountMax, sortBy, sortOrder, page, pageSize,
    } = parsed.data;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { account: { userId: user.id } };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { merchantName: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (accountId) where.accountId = accountId;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      where.amount = {};
      if (amountMin !== undefined) where.amount.gte = amountMin;
      if (amountMax !== undefined) where.amount.lte = amountMax;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { account: { select: { name: true, institution: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
