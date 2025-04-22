import { configDotenv } from "dotenv";
import express from "express";
import connectDB from "./lib/connectDB.js";
import aiRoutes from "./features/ai-prompts/routes.js";
import cors from "cors"
import session from "express-session";
import cookieParser from "cookie-parser";

configDotenv();
connectDB();

export const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001', 
  credentials: true,         
}));

app.use(cookieParser())
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,          
    httpOnly: true,               // Make cookie inaccessible via JavaScript (recommended)
    maxAge: 3600000,              // Cookie expiration (1 hour)
    sameSite: 'lax'              // Allow cookies to be sent cross-origin
  }
}));


app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});


app.use("/api/v0", aiRoutes);


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${PORT}`);
});


