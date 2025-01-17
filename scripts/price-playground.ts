import readline from "readline";
import { calculateNewStockPrice } from "../lib/game/price";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let lastValues = {
  currentPrice: 100,
  orderQuantity: 50,
  totalStocksOwned: 1000,
  isBuy: true,
};

async function prompt(
  question: string,
  defaultValue?: string | number | boolean
): Promise<string> {
  return new Promise((resolve) => {
    const defaultStr = defaultValue !== undefined ? ` (${defaultValue})` : "";
    rl.question(`${question}${defaultStr}: `, (answer) => {
      resolve(answer || String(defaultValue));
    });
  });
}

async function main() {
  console.log("\n🎮 Stock Price Calculator Playground\n");

  while (true) {
    const currentPrice = parseInt(
      await prompt(
        "Enter current price (or 'q' to quit)",
        lastValues.currentPrice
      )
    );
    if (isNaN(currentPrice)) break;

    const orderQuantity = parseInt(
      await prompt("Enter order quantity", lastValues.orderQuantity)
    );
    const totalStocksOwned = parseInt(
      await prompt(
        "Enter total stocks owned in market",
        lastValues.totalStocksOwned
      )
    );
    const isBuy =
      (
        await prompt("Is this a buy order? (y/n)", lastValues.isBuy ? "y" : "n")
      ).toLowerCase() === "y";

    lastValues = {
      currentPrice,
      orderQuantity,
      totalStocksOwned,
      isBuy,
    };

    const newPrice = calculateNewStockPrice({
      currentPrice,
      orderQuantity,
      totalStocksOwned,
      isBuy,
    });

    console.log(
      `\n💹 Price change: ${currentPrice} → ${newPrice} (${isBuy ? "+" : ""}${(
        (newPrice / currentPrice - 1) *
        100
      ).toFixed(1)}%)\n`
    );
  }

  rl.close();
  console.log("\nThanks for playing! 👋\n");
}

main().catch(console.error);
