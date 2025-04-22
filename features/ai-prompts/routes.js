import express from "express";
import { handleUserPrompt } from "./controllers.js";
const router = express.Router();


router.post("/handle-ai-prompt",handleUserPrompt)

export default router