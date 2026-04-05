import mongoose from "mongoose";

const VacationHistorySchema = new mongoose.Schema(
{
  employeeId: {
    type: Number,
    required: true,
    index: true,
  },

  daysTaken: {
    type: Number,
    required: true,
  },

  date: {
    type: Date,
    required: true,
  }
},
{
  timestamps: true,
  versionKey: false,
}
);

export default mongoose.model("VacationHistory", VacationHistorySchema);