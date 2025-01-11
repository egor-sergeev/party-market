import { Button } from "@/components/ui/button";
import { type Stock } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

interface StockOrderFormProps {
  stock: Stock;
  ownedQuantity: number;
  type: "buy" | "sell";
  playerCash: number;
  onCancel: () => void;
  onSubmit: (quantity: number) => Promise<void>;
}

export function StockOrderForm({
  stock,
  ownedQuantity,
  type,
  playerCash,
  onCancel,
  onSubmit,
}: StockOrderFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxQuantity =
    type === "sell"
      ? ownedQuantity
      : Math.floor(playerCash / stock.current_price);
  const totalPrice = quantity * stock.current_price;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(quantity);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "p-6 bg-white rounded-lg shadow-lg transition-all",
        "border-2",
        type === "buy" ? "border-blue-500" : "border-red-500"
      )}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-medium">{stock.name}</h3>
          <div className="text-sm text-gray-500">
            ${stock.current_price.toLocaleString()} per share
          </div>
        </div>
        <div
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            type === "buy"
              ? "bg-blue-100 text-blue-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {type === "buy" ? "Buy Order" : "Sell Order"}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity <= 1 || isSubmitting}
        >
          <MinusIcon className="h-4 w-4" />
        </Button>

        <div className="text-center flex-1">
          <div className="text-2xl font-bold">{quantity}</div>
          <div className="text-sm text-gray-500">
            ${totalPrice.toLocaleString()} total
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
          disabled={quantity >= maxQuantity || isSubmitting}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {type === "buy" && (
        <div className="text-sm text-gray-500 text-center mb-4">
          Max: {maxQuantity} shares ($
          {(maxQuantity * stock.current_price).toLocaleString()} total)
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={isSubmitting || maxQuantity === 0}
          variant={type === "buy" ? "default" : "destructive"}
        >
          {isSubmitting ? "Submitting..." : "Submit Order"}
        </Button>
      </div>
    </div>
  );
}
