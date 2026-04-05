import mongoose from "mongoose";

const PayrollTransactionSchema = new mongoose.Schema(
{
  employeeId: {
    type: Number,
    required: true,
    index: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  type: {
    type: String,
    enum: ["salary", "bonus", "overtime", "allowance"],
    required: true,
  },

  payDate: {
    type: Date,
    required: true,
  }
},
{
  timestamps: true,
  versionKey: false,
}
);

export default mongoose.model("PayrollTransaction", PayrollTransactionSchema);