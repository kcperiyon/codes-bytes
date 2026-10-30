import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import { publicRouter } from "./routes/public";
import { ingestRouter } from "./routes/ingest";
import { adminRouter } from "./routes/admin";
import { partnerRouter } from "./routes/partner";
import { associateRouter } from "./routes/associate";

const app = express();
app.use(cors());
app.use(express.json());

app.use(publicRouter);
app.use(ingestRouter);
app.use(adminRouter);
app.use(partnerRouter);
app.use(associateRouter);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Serve the built frontend (Vite output) from the same origin, same pattern as TaxMasterAgent.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/go/")) return next();
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 4500;
app.listen(port, () => console.log(`Codes&Bytes Sales listening on :${port}`));
