import "dotenv/config";
import cors from "cors";
import express from "express";
import { api } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use("/api", api);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
