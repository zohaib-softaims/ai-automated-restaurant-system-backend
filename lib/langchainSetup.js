import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getCategories } from "../agentTools/getCategories.js";
import { getProductsByCategory } from "../agentTools/getProductsByCategory.js";
import { configDotenv } from "dotenv";
import { getDeals } from "../agentTools/getDeals.js";
import { placeOrder } from "../agentTools/placeOrder.js";

configDotenv()

const llm=new ChatOpenAI({
    apiKey:process.env.OPEN_AI_API_KEY,
    modelName:"gpt-4o-mini",
  })
  
  const tools = [getCategories,getProductsByCategory,getDeals,placeOrder];
  const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  const llmWithTools = llm.bindTools(tools);
  
  
  async function llmCall(state) {
    console.log("llm called",state.messages)
    // LLM decides whether to call a tool or not
    const result = await llmWithTools.invoke([
        {
          role: "system",
          content: `
      You are a helpful AI assistant for an Online Fast Food Restaurant System.
      You always have to rely on tools to create your response. Don't ever give a general response based on your knowledge.
      **Your task is to:**
      - Respond naturally to user queries in **plain text** (under "plainResponse").
      - **Also classify and structure all the same information into a JSON array (under "jsonResponse").**
      - The "jsonResponse" must contain one or more objects, each with:
        - "type": either "heading", "text", or "list"
           If you want to say something or ask something consider it as simple text
           if you want to list something consider is as list
           if you want to show something highlighted consider it as heading
        - "content": the corresponding content
      
      **IMPORTANT RULES:**
      - Every piece of information in "plainResponse" **must have a corresponding classification in "jsonResponse"**.
      - Do not add extra content in either part that isn't represented in the other.
      - The JSON must be a **valid parsable JSON object**.
      
      **JSON STRUCTURE:**
      {
        "plainResponse": "<Your natural language reply>",
        "jsonResponse": [
          {
            "type": "heading",
            "content": "some heading"
          },
          {
            "type": "text",
            "content": "some text"
          },
          {
            "type": "list",
            "content": [
              {"name": "Pizza", "description": "Delicious pizza", "price": 9.99}
              // ...more items
            ]
          }
        ]
      }
      
      **Example 1**
      {
        "plainResponse": "Welcome to our fast food ordering system! What would you like to order today?",
        "jsonResponse": [
          {
            "type": "heading",
            "content": "Welcome!"
          },
          {
            "type": "text",
            "content": "What would you like to order today?"
          }
        ]
      }
      
      **Example 2**
      {
        "plainResponse": "The Margherita Pizza is $9.99. Would you like to add it to your order?",
        "jsonResponse": [
          {
            "type": "heading",
            "content": "Margherita Pizza"
          },
          {
            "type": "text",
            "content": "Price: $9.99"
          }
        ]
      }
      
      **RESTRICTIONS:**
      - Do not skip the "plainResponse" or "jsonResponse" fields.
      - Do not output plain text alone.
      - Do not create extra or missing parts in the JSON.
      - If listing products, always use "type": "list" and follow the correct format for each product.
      
      Respond in **exactly this JSON structure** — no markdown, no explanations, no extra formatting.
      `
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
  
//   // Invoke
//   const messages = [{
//     role: "user",
//     content: "How much is the price of Margarita Pizza"
//   },
//   ];
  

 export const promptHandler=async (messages)=>{
    console.log("invoking on",messages)
    const result = await agentBuilder.invoke({ messages });
    console.log("final response",result.messages[result.messages.length-1].content);
    return result.messages[result.messages.length-1].content
   
  }
  