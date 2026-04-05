import express from "express";
import VacationHistory from "../models/VacationHistory.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await VacationHistory.aggregate([
      {
        $group: {
          _id: "$employeeId",
          totalVacation: { $sum: "$daysTaken" }
        }
      },
      {
        $project: {
          employeeId: "$_id",
          totalVacation: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send("VACATION ERROR");
  }
});

export default router;