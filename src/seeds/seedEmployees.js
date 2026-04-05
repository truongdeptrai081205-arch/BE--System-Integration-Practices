import mongoose from "mongoose";
import { MONGODB_URI } from "../config.js";
import Employee from "../models/Employee.js";

// connect DB
await mongoose.connect(MONGODB_URI);
console.log("Connected DB");

// tạo dữ liệu fake
const generateEmployees = (count, startIndex) => {
  const data = [];

  for (let i = 0; i < count; i++) {
    data.push({
       employeeId: startIndex + i + 1, 
        firstName: `User${i}`,
        lastName: "Test",
        vacationDays: 10,
        paidToDate: 1000,
        paidLastYear: 800,
        payRate: 20,
        payRateId: 1,
    });
  }

  return data;
};

const seed = async () => {
  try {
    await Employee.deleteMany();
    console.log("Cleared old data");

    const total = 500000;
    const batchSize = 10000;

    for (let i = 0; i < total; i += batchSize) {
      const batch = generateEmployees(batchSize, i);

      await Employee.insertMany(batch);
      console.log(`Inserted ${i + batchSize}`);
    }

    const count = await Employee.countDocuments();
    console.log("TOTAL IN DB:", count);

    console.log("DONE SEED 500K 🎉");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

seed();