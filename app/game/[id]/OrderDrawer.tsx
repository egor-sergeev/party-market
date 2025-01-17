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
import { useUser } from "@/lib/auth";
import { Stock } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface StockWithQuantity extends Stock {
  owned_quantity: number;
  total_worth: number;
}

interface OrderDrawerProps {
  stock: StockWithQuantity | null;
  type: "buy" | "sell" | null;
  roomId: string;
  round: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export function OrderDrawer({
  stock,
  type,
  roomId,
  round,
  onClose,
  onSubmitted,
}: OrderDrawerProps) {
  const [quantity, setQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();
  const { user } = useUser();

  useEffect(() => {
    async function fetchMaxQuantity() {
      if (!stock || !type || !user) return;

      if (type === "sell") {
        // For sell orders, max quantity is the owned quantity
        setMaxQuantity(stock.owned_quantity);
        setQuantity(0);
      } else {
        // For buy orders, max quantity is based on available cash
        const { data: player } = await supabase
          .from("players")
          .select("cash")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .single();

        if (player) {
          const maxAffordable = Math.floor(player.cash / stock.current_price);
          setMaxQuantity(maxAffordable);
          setQuantity(0);
        }
      }
    }

    fetchMaxQuantity();
  }, [stock, type, roomId, user, supabase]);

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

  return (
    <Drawer open={Boolean(stock && type)} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="font-mono">{stock?.symbol}</DrawerTitle>
                <p className="text-sm text-muted-foreground">{stock?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium capitalize">{type} Order</p>
                <p className="text-sm text-muted-foreground">
                  $ {stock?.current_price.toLocaleString()} per share
                </p>
              </div>
            </div>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity === 0}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <p className="text-2xl font-mono tabular-nums">{quantity}</p>
                <p className="text-sm text-muted-foreground">
                  $ {(quantity * (stock?.current_price || 0)).toLocaleString()}
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity === maxQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setQuantity(maxQuantity)}
              disabled={quantity === maxQuantity}
            >
              Set Max ({maxQuantity})
            </Button>
          </div>

          <DrawerFooter>
            <Button
              className="w-full capitalize"
              disabled={quantity === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? "Submitting..."
                : `${type} ${quantity} Share${quantity === 1 ? "" : "s"}`}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
