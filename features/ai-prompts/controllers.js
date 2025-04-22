import { promptHandler } from "../../lib/langchainSetup.js";

export const handleUserPrompt = async (req, res) => {
  try {
    const { message } = req.body;
    const sessionMessages = req.session.messages;
    if (sessionMessages) {
      req.session.messages = [...sessionMessages, message];
    } else {
      req.session.messages = [message];
    }
    req.session.save();

    if (!message) {
      return res.status(400).json({ error: "Please provide  a prompt" });
    }
    const aiResponse = await promptHandler(req.session.messages);
    const parsedAiResponse = JSON.parse(aiResponse);
    req.session.messages.push({ role: "ai", content: aiResponse });

    console.log("Session Data:", req.session);
    res.status(200).json({ message: "success", reply: JSON.stringify(parsedAiResponse.jsonResponse) });
  } catch (error) {
    console.error("Error handling user prompt:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
