import mongoose from "mongoose";

const AlertConfigSchema = new mongoose.Schema(
{
  type: {
    type: String,
    enum: ["anniversary", "vacation_limit", "birthday", "benefit_change"],
    required: true,
  },

  threshold: {
    type: Number, // ví dụ: 30 ngày
  },

  description: String
},
{
  timestamps: true,
  versionKey: false,
}
);

export default mongoose.model("AlertConfig", AlertConfigSchema);