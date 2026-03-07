interface CostBasisEntry {
  purchasePrice: number;
  quantity: number;
}

interface HoldingWithCostBasis {
  id: string;
  name: string;
  ticker: string | null;
  category: string;
  quantity: number;
  price: number;
  value: number;
  costBasis: CostBasisEntry[];
}

export function computeGainLoss<T extends HoldingWithCostBasis>(holding: T) {
  const totalCostBasis = holding.costBasis.reduce(
    (sum, cb) => sum + cb.purchasePrice * cb.quantity,
    0
  );
  const totalCostQuantity = holding.costBasis.reduce(
    (sum, cb) => sum + cb.quantity,
    0
  );
  const avgCostPerUnit = totalCostQuantity > 0
    ? totalCostBasis / totalCostQuantity
    : 0;

  const gainLoss = holding.value - totalCostBasis;
  const gainLossPercent = totalCostBasis > 0
    ? ((holding.value - totalCostBasis) / totalCostBasis) * 100
    : 0;

  return {
    ...holding,
    totalCostBasis,
    avgCostPerUnit,
    gainLoss,
    gainLossPercent,
  };
}
