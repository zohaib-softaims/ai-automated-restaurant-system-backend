import { tool } from "@langchain/core/tools";
import Product from "../models/ProductModel.js";
import Category from "../models/CategoryModel.js";
export const getProductsByCategory = tool(
  async ({ categoryName }) => {
    try {
      const category = await Category.findOne({ name: categoryName }).exec();
      if (!category) {
        return `Error: Category "${categoryName}" not found. Please check the spelling or choose from the available categories (Shawarma, Pizza, Burgers, Drinks).`;
      }

      const products = await Product.find({ category: category._id }).select('name description price');
      if (products.length === 0) {
        return `No products found for the "${categoryName}" category.`; 
      }

      return JSON.stringify(products);
    } catch (error) {
      return `Error: ${error.message}`; 
    }
  },
  {
    name: 'getProductsByCategory',
    description: 'Return all products available under a specific category (eating option).',
    schema: {
      type: 'object',
      properties: {
        categoryName: {
          type: 'string',
          enum: ['Shawarma', 'Pizza', 'Burgers', 'Drinks'],
          description: 'The category name to fetch products for.',
        },
      },
      required: ['categoryName'], 
    },
  }
);