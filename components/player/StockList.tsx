import { Button } from "@/components/ui/button";
import { type Stock } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { StockOrderForm } from "./StockOrderForm";

interface StockListProps {
  allStocksWithQuantity: {
    stock: Stock;
    quantity: number;
  }[];
  playerCash: number;
  pendingOrders: {
    stockId: string;
    type: "buy" | "sell";
    quantity: number;
    id: string;
  }[];
  onSubmitOrder: (order: {
    stockId: string;
    type: "buy" | "sell";
    quantity: number;
  }) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
}

export function StockList({
  allStocksWithQuantity,
  playerCash,
  pendingOrders,
  onSubmitOrder,
  onCancelOrder,
}: StockListProps) {
  const [selectedStock, setSelectedStock] = useState<{
    stock: Stock;
    quantity: number;
    type: "buy" | "sell";
  } | null>(null);

  return (
    <div className="space-y-4">
      {allStocksWithQuantity.map(({ stock, quantity }) => {
        const isSelected = selectedStock?.stock.id === stock.id;
        const pendingOrder = pendingOrders.find((o) => o.stockId === stock.id);

        if (isSelected) {
          return (
            <StockOrderForm
              key={stock.id}
              stock={stock}
              ownedQuantity={quantity}
              playerCash={playerCash}
              type={selectedStock.type}
              onCancel={() => setSelectedStock(null)}
              onSubmit={async (orderQuantity: number) => {
                await onSubmitOrder({
                  stockId: stock.id,
                  type: selectedStock.type,
                  quantity: orderQuantity,
                });
                setSelectedStock(null);
              }}
            />
          );
        }

        return (
          <div
            key={stock.id}
            className={cn(
              "p-4 bg-white rounded-lg shadow transition-all",
              "flex items-center gap-4"
            )}
          >
            <div className="flex-1">
              <div className="font-medium">{stock.name}</div>
              <div className="text-sm text-gray-500">
                {quantity} shares • {stock.dividend_yield.toFixed(1)}% yield • $
                {stock.current_price.toLocaleString()} per share
              </div>
              {pendingOrder && (
                <div className="text-sm font-medium text-blue-600 mt-1">
                  Pending {pendingOrder.type} order: {pendingOrder.quantity}{" "}
                  shares
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {pendingOrder ? (
                <Button
                  variant="outline"
                  onClick={() => onCancelOrder(pendingOrder.id)}
                >
                  Cancel Order
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelectedStock({
                        stock,
                        quantity,
                        type: "buy",
                      })
                    }
                    disabled={
                      stock.current_price > playerCash ||
                      pendingOrders.length > 0
                    }
                  >
                    Buy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelectedStock({
                        stock,
                        quantity,
                        type: "sell",
                      })
                    }
                    disabled={quantity === 0 || pendingOrders.length > 0}
                  >
                    Sell
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
