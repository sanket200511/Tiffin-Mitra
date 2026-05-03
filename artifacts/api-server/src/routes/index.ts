import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vendorRouter from "./vendors";
import menuRouter from "./menus";
import subscriptionRouter from "./subscriptions";
import orderRouter from "./orders";
import customerRouter from "./customers";
import reviewRouter from "./reviews";
import analyticsRouter from "./analytics";
import deliveryRouter from "./deliveries";
import peerDeliveryRouter from "./peer-deliveries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vendorRouter);
router.use(menuRouter);
router.use(subscriptionRouter);
router.use(orderRouter);
router.use(customerRouter);
router.use(reviewRouter);
router.use(analyticsRouter);
router.use(deliveryRouter);
router.use(peerDeliveryRouter);

export default router;
