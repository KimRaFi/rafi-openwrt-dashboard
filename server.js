import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

let latestData = null; // in-memory storage

// receive data from router
app.post("/api/update", (req, res) => {
  latestData = req.body;

  // Optional: save to file
  fs.writeFileSync("data.json", JSON.stringify(latestData, null, 2));

  res.json({ status: "ok", message: "Router data received" });
});

// dashboard reads this
app.get("/api/data", (req, res) => {
  if (!latestData) {
    return res.json({ status: "waiting", message: "No data yet" });
  }
  res.json(latestData);
});

app.get("/", (req, res) => {
  res.send("OpenWRT Render API running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));