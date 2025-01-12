"use client";

import { type Stock } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StockWithHolders = Stock & {
  holders: { playerId: string; playerName: string }[];
};

export function StocksTable({
  stocks,
  className,
}: {
  stocks: StockWithHolders[];
  className?: string;
}) {
  return (
    <div
      className={cn("bg-white rounded-lg shadow-sm overflow-hidden", className)}
    >
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Market Overview</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Stock
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                Price
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                Dividend
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Holders
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stocks.map((stock) => (
              <tr key={stock.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{stock.name}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  ${stock.current_price.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  ${stock.dividend_amount.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {stock.holders.map((holder) => (
                      <div
                        key={holder.playerId}
                        className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium ring-2 ring-white"
                        title={holder.playerName}
                      >
                        {holder.playerName[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
