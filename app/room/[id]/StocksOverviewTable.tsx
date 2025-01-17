"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stock } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";

// Types
interface PlayerStock {
  player: {
    name: string;
  };
}

interface StockWithHolders extends Stock {
  player_stocks: PlayerStock[];
  holders: string[];
}

function PriceDiff({
  current,
  previous,
}: {
  current: number;
  previous: number | null;
}) {
  if (!previous) return null;
  const diff = current - previous;
  if (diff === 0) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "ml-2 text-white border-0 h-5 px-1.5 text-xs",
        diff > 0 ? "bg-green-500" : "bg-red-500"
      )}
    >
      {diff > 0 ? (
        <ArrowUpIcon className="w-3 h-3 mr-0.5" />
      ) : (
        <ArrowDownIcon className="w-3 h-3 mr-0.5" />
      )}
      {Math.abs(diff)}
    </Badge>
  );
}

// Memoized row component to prevent unnecessary re-renders
const StockRow = memo(function StockRow({
  stock,
}: {
  stock: StockWithHolders;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{stock.symbol}</TableCell>
      <TableCell>{stock.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          ${stock.current_price}
          <PriceDiff
            current={stock.current_price}
            previous={stock.previous_price}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          ${stock.dividend_amount}
          <PriceDiff
            current={stock.dividend_amount}
            previous={stock.previous_dividends}
          />
        </div>
      </TableCell>
      <TableCell>{stock.holders.join(", ")}</TableCell>
    </TableRow>
  );
});

// Custom hook for stocks data management
function useStocksData(roomId: string) {
  const [stocks, setStocks] = useState<StockWithHolders[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Load initial data and setup subscriptions
    async function loadStocks() {
      try {
        const { data, error } = await supabase
          .from("stocks")
          .select(
            `
            *,
            player_stocks (
              player:players ( name )
            )
          `
          )
          .eq("room_id", roomId)
          .order("id", { ascending: true }); // Maintain consistent order by id

        if (error) throw error;

        // Transform data
        const transformedStocks = data.map((stock) => ({
          ...stock,
          holders: Array.from(
            new Set(
              stock.player_stocks.map((ps: PlayerStock) => ps.player.name)
            )
          ),
        }));

        setStocks(transformedStocks);
      } catch (error) {
        console.error("Error loading stocks:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStocks();

    // Setup real-time subscriptions
    const channel = supabase
      .channel(`stocks:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stocks",
          filter: `room_id=eq.${roomId}`,
        },
        loadStocks
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stocks",
          filter: `room_id=eq.${roomId}`,
        },
        loadStocks
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase]);

  return { stocks, isLoading };
}

// Main component
export function StocksOverviewTable({ roomId }: { roomId: string }) {
  const { stocks, isLoading } = useStocksData(roomId);

  if (isLoading) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Dividend</TableHead>
          <TableHead>Holders</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock) => (
          <StockRow key={stock.id} stock={stock} />
        ))}
      </TableBody>
    </Table>
  );
}
