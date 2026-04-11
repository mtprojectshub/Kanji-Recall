import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ocrRouter from "./ocr";
import cardsRouter from "./cards";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ocr", ocrRouter);
router.use("/cards", cardsRouter);
router.use("/sessions", sessionsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
