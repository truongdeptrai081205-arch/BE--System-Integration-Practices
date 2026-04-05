import mongoose from "mongoose";
import { MONGODB_URI } from "../config.js";

import Employee from "../models/Employee.js";
import PayrollTransaction from "../models/PayrollTransaction.js";
import VacationHistory from "../models/VacationHistory.js";
import EmployeeExtra from "../models/EmployeeExtra.js";
import BenefitTransaction from "../models/BenefitTransaction.js";

await mongoose.connect(MONGODB_URI);
console.log("Connected DB");

// CONFIG
const TOTAL = 500000;
const BATCH_SIZE = 10000;

// ===== HELPER =====
const random = (min, max) => Math.floor(Math.random() * (max - min) + min);

const randomDate = () => {
  const start = new Date(2023, 0, 1);
  const end = new Date();
  return new Date(start.getTime() + Math.random() * (end - start));
};

const departments = ["HR", "IT", "Finance", "Marketing"];
const types = ["salary", "bonus", "overtime"];
const empTypes = ["full-time", "part-time"];

// ===== GENERATORS =====

// 1. Employee
const genEmployees = (count, start) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      employeeId: start + i + 1,
      firstName: `User${start + i}`,
      lastName: "Test",
      vacationDays: random(5, 20),
      paidToDate: random(1000, 5000),
      paidLastYear: random(800, 4000),
      payRate: random(15, 50),
      payRateId: 1,
    });
  }
  return arr;
};

// 2. PayrollTransaction
const genPayroll = (count) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      employeeId: random(1, 10000),
      amount: random(1000, 5000),
      type: types[random(0, types.length)],
      payDate: randomDate(),
    });
  }
  return arr;
};

// 3. VacationHistory
const genVacation = (count) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      employeeId: random(1, 10000),
      daysTaken: random(1, 5),
      date: randomDate(),
    });
  }
  return arr;
};

// 4. EmployeeExtra
const genExtra = (count, start) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      employeeId: start + i + 1,
      department: departments[random(0, departments.length)],
      employmentType: empTypes[random(0, empTypes.length)],
      dateOfBirth: new Date(1990 + random(0, 10), random(0, 12), random(1, 28)),
    });
  }
  return arr;
};

// 5. BenefitTransaction
const genBenefit = (count) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      employeeId: random(1, 10000),
      benefitPlanId: random(1, 5),
      cost: random(100, 1000),
      date: randomDate(),
    });
  }
  return arr;
};

// ===== SEED FUNCTION =====

const seedCollection = async (Model, generator, name, withIndex = false) => {
  console.log(`\nSeeding ${name}...`);

  await Model.deleteMany();

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const batch = withIndex
      ? generator(BATCH_SIZE, i)
      : generator(BATCH_SIZE);

    await Model.insertMany(batch, { ordered: false });
    console.log(`${name}: ${i + BATCH_SIZE}`);
  }

  const count = await Model.countDocuments();
  console.log(`${name} DONE:`, count);
};

// ===== RUN ALL =====

const run = async () => {
  try {
    await seedCollection(Employee, genEmployees, "Employee", true);
    await seedCollection(EmployeeExtra, genExtra, "EmployeeExtra", true);
    await seedCollection(PayrollTransaction, genPayroll, "PayrollTransaction");
    await seedCollection(VacationHistory, genVacation, "VacationHistory");
    await seedCollection(BenefitTransaction, genBenefit, "BenefitTransaction");

    console.log("\n🎉 ALL DONE 500K EACH 🎉");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

run();