import mongoose from "mongoose";

export const dbConnection = () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is not defined in .env file.");
    return;
  }

  console.log("MongoDB URI:", uri);  // Log URI to check if it is correctly loaded

  mongoose
    .connect(uri, { dbName: "clinic" }) // Ensure dbName is correct
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("Some error occurred while connecting to database:", error);
    });
};
