import mongoose from "mongoose";

let isConnected = false;
const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};
 const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }
  try {
    const connection = await mongoose.connect(
      process.env.MONGO_DB_URI,
      clientOptions
    );
    isConnected = connection.connections[0].readyState;
    console.log(`MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB