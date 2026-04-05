import mongoose from "mongoose";

const BenefitTransactionSchema = new mongoose.Schema(
{
  employeeId: {
    type: Number,
    required: true,
    index: true,
  },

  benefitPlanId: {
    type: Number,
    required: true,
  },

  cost: {
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

export default mongoose.model("BenefitTransaction", BenefitTransactionSchema);