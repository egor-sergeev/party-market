"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/lib/auth";
import { Stock } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface StockWithQuantity extends Stock {
  owned_quantity: number;
  total_worth: number;
}

interface OrderDrawerProps {
  stock: StockWithQuantity | null;
  roomId: string;
  round: number;
  onClose: () => void;
  onSubmitted: () => void;
  playerCash: number;
}

export function OrderDrawer({
  stock,
  roomId,
  round,
  onClose,
  onSubmitted,
  playerCash,
}: OrderDrawerProps) {
  const [type, setType] = useState<"buy" | "sell" | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();
  const { user } = useUser();

  const canBuy = stock && playerCash >= stock.current_price;
  const canSell = stock && stock.owned_quantity > 0;

  useEffect(() => {
    if (!stock) {
      setType(null);
      return;
    }

    // Auto-select type if only one option is available
    if (canBuy && !canSell) setType("buy");
    else if (!canBuy && canSell) setType("sell");
    else if (canBuy && canSell) setType("buy");
    else setType(null);
  }, [stock, canBuy, canSell]);

  useEffect(() => {
    if (!stock || !type) {
      setMaxQuantity(0);
      setQuantity(0);
      return;
    }

    if (type === "sell") {
      setMaxQuantity(stock.owned_quantity);
    } else {
      setMaxQuantity(Math.floor(playerCash / stock.current_price));
    }
    setQuantity(0);
  }, [stock, type, playerCash]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 0 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleSubmit = async () => {
    if (!stock || !type || !user || quantity === 0) return;

    try {
      setIsSubmitting(true);

      const { error } = await supabase.from("orders").insert({
        room_id: roomId,
        user_id: user.id,
        stock_id: stock.id,
        type,
        requested_quantity: quantity,
        requested_price_total: quantity * stock.current_price,
        status: "pending",
        round,
      });

      if (error) throw error;
      onSubmitted();
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setType(null);
    onClose();
  };

  return (
    <Drawer open={!!stock} onOpenChange={handleClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl leading-none">{stock?.symbol}</span>
                <DrawerTitle className="truncate text-base font-normal text-muted-foreground">
                  {stock?.name}
                </DrawerTitle>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium tabular-nums">
                  $ {stock?.current_price.toLocaleString()}
                </p>
              </div>
            </div>

            <Tabs
              value={type || ""}
              onValueChange={(value: string) =>
                setType(value as "buy" | "sell" | null)
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sell" disabled={!canSell}>
                  Sell
                </TabsTrigger>
                <TabsTrigger value="buy" disabled={!canBuy}>
                  Buy
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DrawerHeader>

          {type && (
            <div className="p-4 pb-0 space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 touch-none active:transform-none"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity === 0}
                >
                  <Minus className="h-8 w-8" />
                </Button>

                <div className="text-center">
                  <p className="text-4xl font-mono tabular-nums">{quantity}</p>
                  <p className="text-sm text-muted-foreground">
                    ${" "}
                    {(quantity * (stock?.current_price || 0)).toLocaleString()}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 touch-none active:transform-none"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity === maxQuantity}
                >
                  <Plus className="h-8 w-8" />
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setQuantity(maxQuantity)}
                disabled={quantity === maxQuantity}
              >
                Set Max ({maxQuantity})
              </Button>
            </div>
          )}

          <DrawerFooter>
            {type && (
              <Button
                className={cn(
                  "w-full h-14 text-lg font-medium text-white",
                  type === "buy"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                )}
                disabled={quantity === 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? "Submitting..."
                  : type === "buy"
                  ? `Buy ${quantity} for $${(
                      quantity * (stock?.current_price || 0)
                    ).toLocaleString()}`
                  : `Sell ${quantity} for $${(
                      quantity * (stock?.current_price || 0)
                    ).toLocaleString()}`}
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline" className="h-12">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
