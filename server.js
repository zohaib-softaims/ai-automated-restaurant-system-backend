
import { configDotenv } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import z from "zod"
import connectDB from "./models/connectDB.js";
import Category from "./models/CategoryModel.js";
import Product from "./models/ProductModel.js";

configDotenv()
await connectDB()

const llm=new ChatOpenAI({
  apiKey:process.env.OPEN_AI_API_KEY,
  modelName:"gpt-4o-mini"
})
// Define tools

const getCategories = tool(
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

const getProductsByCategory = tool(
  async ({ categoryName }) => {
    try {
      const category = await Category.findOne({ name: categoryName }).exec();
      if (!category) {
        return `Error: Category "${categoryName}" not found. Please check the spelling or choose from the available categories (Shawarma, Pizza, Burgers, Drinks).`;
      }

      // Fetch products for the matched category
      const products = await Product.find({ category: category._id }).select('name description price');
      if (products.length === 0) {
        return `No products found for the "${categoryName}" category.`; // No products in the category
      }

      return JSON.stringify(products); // Return products as JSON string
    } catch (error) {
      return `Error: ${error.message}`; // Handle any other errors
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


const multiply = tool(
  async ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "Multiply two numbers together",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const add = tool(
  async ({ a, b }) => {
    return a + b;
  },
  {
    name: "add",
    description: "Add two numbers together",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const divide = tool(
  async ({ a, b }) => {
    return a / b;
  },
  {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);





const tools = [getCategories,getProductsByCategory,add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);


async function llmCall(state) {
  console.log("llm called",state.messages)
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: "You are a helpful assistant tasked with solving airthmetic operarions"
    },
    ...state.messages
  ]);

  return {
    messages: [result]
  };
}

const toolNode = new ToolNode(tools);

function shouldContinue(state) {
  console.log("should continue",state.messages)
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}


// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  // Add edges to connect nodes
  .addEdge("__start__", "llmCall")
  .addConditionalEdges(
    "llmCall",
    shouldContinue,
    {
      // Name returned by shouldContinue : Name of next node to visit
      "Action": "tools",
      "__end__": "__end__",
    }
  )
  .addEdge("tools", "llmCall")
  .compile();

// Invoke
const messages = [{
  role: "user",
  content: "How much is the price of Margarita Pizza"
},
];

const result = await agentBuilder.invoke({ messages });
console.log("final response",result.messages[result.messages.length-1]);