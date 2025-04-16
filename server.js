
import { configDotenv } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import z from "zod"
import { menuData } from "./dummydata.js";
configDotenv()
const llm=new ChatOpenAI({
  apiKey:process.env.OPEN_AI_API_KEY,
  modelName:"gpt-4o-mini"
})
// Define tools
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

const getMenu = tool(
  async () => {
    return JSON.stringify(menuData);
  },
  {
    name: "get_menu",
    description: "Fetch the list of available fast food menu items.",
    parameters: z.object({})
  }
);



const tools = [add, multiply, divide,getMenu];
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
  content: "Add 2 numbers?"
},
{
  role:"ai",
  content:"Kindly give 2 number you want to add"
},{
  role:"user",
  content:"its 4 and 5"
}];

const result = await agentBuilder.invoke({ messages });
console.log("final response",result.messages[result.messages.length-1]);