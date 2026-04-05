import express from "express";
import BenefitTransaction from "../models/BenefitTransaction.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await BenefitTransaction.aggregate([
      {
        $group: {
          _id: "$benefitPlanId",
          avgBenefit: { $avg: "$cost" }
        }
      },
      {
        $project: {
          benefitPlanId: "$_id",
          avgBenefit: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send("BENEFIT ERROR");
  }
});

export default router;