import { tool } from "@langchain/core/tools";
import Deal from '../models/DealsModel.js';

export const getDeals = tool(
  async () => {
    try {
      const deals = await Deal.find({ isActive: true })
        .populate({
          path: 'products.product',
          select: 'name price'
        });

        console.log("db data",deals)
      return JSON.stringify(deals);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: 'getDeals',
    description: 'Return the list of available food deals with products, their quantity and prices.',
    schema: {}, // no input needed
  }
);
