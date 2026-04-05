import mongoose from "mongoose";

const EmployeeExtraSchema = new mongoose.Schema(
{
  employeeId: {
    type: Number,
    required: true,
    unique: true,
  },

  department: {
    type: String,
    required: true,
  },

  employmentType: {
    type: String,
    enum: ["full-time", "part-time"],
    required: true,
  },

  dateOfBirth: {
    type: Date,
    required: true,
  }
},
{
  timestamps: true,
  versionKey: false,
}
);

export default mongoose.model("EmployeeExtra", EmployeeExtraSchema);