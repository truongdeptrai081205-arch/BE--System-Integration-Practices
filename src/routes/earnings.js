import express from "express";
import PayrollTransaction from "../models/PayrollTransaction.js";
const router = express.Router();

// tổng earnings theo employee
router.get("/", async (req, res) => {
  try {
    const data = await PayrollTransaction.aggregate([
      {
        $group: {
          _id: "$employeeId",
          totalEarnings: { $sum: "$amount" }
        }
      },
      {
        $project: {
          employeeId: "$_id",
          totalEarnings: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send("EARNINGS ERROR");
  }
});

export default router;