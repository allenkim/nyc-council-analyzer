import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/categories";
import AddBillForm from "./AddBillForm";
import BillCard from "./BillCard";
import ResetBillsButton from "./ResetBillsButton";
import BillSuggestions from "./BillSuggestion";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const bills = await prisma.bill.findMany({
    orderBy: { dueDay: "asc" },
  });

  const now = new Date();
  const currentDay = now.getDate();

  // Categorize bills by status
  const billsWithStatus = bills.map((bill) => {
    let status: "paid" | "due_soon" | "overdue" | "upcoming" = "upcoming";

    if (bill.isPaid) {
      status = "paid";
    } else if (currentDay > bill.dueDay) {
      status = "overdue";
    } else if (bill.dueDay - currentDay <= 3) {
      status = "due_soon";
    }

    return { ...bill, status };
  });

  const overdueBills = billsWithStatus.filter((b) => b.status === "overdue");
  const dueSoonBills = billsWithStatus.filter((b) => b.status === "due_soon");
  const upcomingBills = billsWithStatus.filter((b) => b.status === "upcoming");
  const paidBills = billsWithStatus.filter((b) => b.status === "paid");

  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);
  const totalRemaining = totalMonthly - totalPaid;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Bill Reminders</h2>
          <p className="text-muted text-sm mt-1">
            Track your recurring bills and due dates
          </p>
        </div>
        <ResetBillsButton />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Monthly Bills</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Paid This Month</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Remaining</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalRemaining)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Bills</p>
          <p className="text-2xl font-bold mt-1">
            {paidBills.length}/{bills.length} paid
          </p>
        </div>
      </div>

      {/* Suggested bills from recurring transactions */}
      <BillSuggestions />

      {/* Add bill form */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Add Bill</h3>
        <AddBillForm />
      </div>

      {/* Overdue bills */}
      {overdueBills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-danger flex items-center gap-2">
            <span className="w-2 h-2 bg-danger rounded-full" />
            Overdue ({overdueBills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoonBills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-warning flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full" />
            Due Soon ({dueSoonBills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dueSoonBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingBills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted flex items-center gap-2">
            <span className="w-2 h-2 bg-muted rounded-full" />
            Upcoming ({upcomingBills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      )}

      {/* Paid */}
      {paidBills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-success flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full" />
            Paid ({paidBills.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paidBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      )}

      {bills.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No bills tracked yet</p>
          <p className="text-muted text-sm">
            Add your recurring bills above to stay on top of due dates and payments.
          </p>
        </div>
      )}
    </div>
  );
}
