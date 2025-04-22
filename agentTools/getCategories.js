import { tool } from "@langchain/core/tools";
import Category from "../models/CategoryModel.js";
export const getCategories = tool(
    async () => {
      try {
        const categories = await Category.find().select('name'); 
        return JSON.stringify(categories); 
      } catch (error) {
        return `Error: ${error.message}`; 
      }
    },
    {
      name: 'getCategories',
      description: 'Return the list of available eating options (categories).',
      schema: {},
    }
  );