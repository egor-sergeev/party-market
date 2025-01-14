/**
 * Calculates the new stock price based on market depth and order size.
 * Uses a sigmoid-based liquidity curve that naturally handles edge cases:
 * - Large orders have diminishing price impact
 * - Impact is higher in thin markets (few stocks owned)
 * - Small orders in liquid markets have minimal impact
 * - Prevents negative or zero prices through natural bounds
 */
export function calculateNewStockPrice({
  currentPrice,
  orderQuantity,
  totalStocksOwned,
  isBuy,
}: {
  currentPrice: number;
  orderQuantity: number;
  totalStocksOwned: number;
  isBuy: boolean;
}): number {
  // Market depth factor: higher when few stocks are owned
  const marketDepth = Math.log(totalStocksOwned + Math.E);

  // Order size relative to market depth
  const relativeOrderSize = orderQuantity / (totalStocksOwned + 1);

  // Base impact using sigmoid function to naturally limit extreme values
  const baseImpact = 2 / (1 + Math.exp(-relativeOrderSize)) - 1;

  // Scale impact based on market depth (thinner markets = higher impact)
  const scaledImpact = baseImpact / marketDepth;

  // Apply direction and calculate final price
  const priceChange = scaledImpact * (isBuy ? 1 : -1);
  const newPrice = currentPrice * (1 + priceChange);

  // Round to nearest integer but ensure price stays positive
  return Math.max(1, Math.round(newPrice));
}
