"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function DiffBadge({
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
        "text-white border-0 h-5 px-1.5 text-xs whitespace-nowrap",
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

const StockSymbol = memo(function StockSymbol({
  symbol,
  name,
  description,
}: {
  symbol: string;
  name: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-center">
      <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-2xl">
        {symbol}
      </div>
      <div className="space-y-1.5">
        <div className="font-medium text-lg leading-none">{name}</div>
        <div className="text-sm text-muted-foreground leading-none">
          {description}
        </div>
      </div>
    </div>
  );
});

const PlayersList = memo(function PlayersList({
  holders,
}: {
  holders: string[];
}) {
  const maxVisible = 8;
  const hasMore = holders.length > maxVisible;
  const visibleHolders = hasMore ? holders.slice(0, maxVisible) : holders;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleHolders.map((name) => (
          <Avatar key={name} className="h-8 w-8 border-2 border-background">
            <AvatarFallback className="bg-gray-200 text-sm font-medium text-primary">
              {name[0]}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {hasMore && (
        <span className="ml-2 text-sm text-muted-foreground">
          +{holders.length - maxVisible}
        </span>
      )}
    </div>
  );
});

const StockRow = memo(function StockRow({
  stock,
}: {
  stock: StockWithHolders;
}) {
  return (
    <TableRow>
      <TableCell>
        <StockSymbol
          symbol={stock.symbol}
          name={stock.name}
          description={stock.description || ""}
        />
      </TableCell>
      <TableCell className="text-right pr-1">
        <span className="text-lg tabular-nums">${stock.current_price}</span>
      </TableCell>
      <TableCell className="pl-1">
        <DiffBadge
          current={stock.current_price}
          previous={stock.previous_price}
        />
      </TableCell>
      <TableCell className="text-right pr-1">
        <span className="text-lg tabular-nums">${stock.dividend_amount}</span>
      </TableCell>
      <TableCell className="pl-1">
        <DiffBadge
          current={stock.dividend_amount}
          previous={stock.previous_dividends}
        />
      </TableCell>
      <TableCell>
        <PlayersList holders={stock.holders} />
      </TableCell>
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
          <TableHead className="text-lg">Stock</TableHead>
          <TableHead className="text-lg text-right">Price</TableHead>
          <TableHead />
          <TableHead className="text-lg text-right">Dividend</TableHead>
          <TableHead />
          <TableHead className="text-lg min-w-[150px]">Holders</TableHead>
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
