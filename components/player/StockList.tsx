import { Button } from "@/components/ui/button";
import { type OrderType } from "@/lib/types/game";
import { type StockListProps } from "@/lib/types/ui";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { StockOrderForm } from "./StockOrderForm";

export function StockList({
  stocks,
  playerCash,
  pendingOrders,
  onSubmitOrder,
  onCancelOrder,
}: StockListProps) {
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(
    null
  );

  const selectedStock = stocks.find(
    ({ stock }) => stock.id === selectedStockId
  );

  return (
    <div className="space-y-4">
      {stocks.map(({ stock, quantity }) => {
        const pendingOrder = pendingOrders.find((o) => o.stockId === stock.id);
        const isSelected = selectedStockId === stock.id;

        if (isSelected && selectedOrderType) {
          return (
            <StockOrderForm
              key={stock.id}
              stock={stock}
              ownedQuantity={quantity}
              type={selectedOrderType}
              playerCash={playerCash}
              onCancel={() => {
                setSelectedStockId(null);
                setSelectedOrderType(null);
              }}
              onSubmit={async (quantity) => {
                await onSubmitOrder({
                  stockId: stock.id,
                  type: selectedOrderType,
                  quantity,
                });
                setSelectedStockId(null);
                setSelectedOrderType(null);
              }}
            />
          );
        }

        return (
          <div
            key={stock.id}
            className={cn(
              "flex items-center justify-between rounded-lg border p-4",
              isSelected && "border-primary"
            )}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{stock.name}</p>
              <p className="text-sm text-muted-foreground">
                {quantity} shares @ ${stock.current_price}
              </p>
              {pendingOrder && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Pending {pendingOrder.type} order for{" "}
                    {pendingOrder.quantity} shares
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelOrder(pendingOrder.id)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStockId(stock.id);
                  setSelectedOrderType("buy");
                }}
                disabled={
                  stock.current_price > playerCash || pendingOrders.length > 0
                }
              >
                Buy
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStockId(stock.id);
                  setSelectedOrderType("sell");
                }}
                disabled={quantity === 0 || pendingOrders.length > 0}
              >
                Sell
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
