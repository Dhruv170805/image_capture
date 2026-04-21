/**
 * Data Migration Script
 * Reads employees.csv and seeds MongoDB Atlas
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Employee = require("../server/models/Employee");
const { connectDB } = require("../server/config/db");

const CSV_PATH = path.join(__dirname, "../data/employees.csv");

async function seed() {
  await connectDB();

  console.log("📖 Reading CSV...");
  const employees = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        employees.push({
          EmployeeCode: row.EmployeeCode.trim().toUpperCase(),
          Name: row.Name.trim(),
          Department: row.Department.trim(),
          IsActive: row.IsActive.trim() === "1",
        });
      })
      .on("end", async () => {
        try {
          console.log(`🧹 Cleaning existing employees...`);
          await Employee.deleteMany({});

          console.log(`🚀 Inserting ${employees.length} employees...`);
          await Employee.insertMany(employees);

          console.log("✅ Seeding completed successfully!");
          mongoose.connection.close();
          resolve();
        } catch (err) {
          console.error("❌ Seeding failed:", err);
          mongoose.connection.close();
          reject(err);
        }
      })
      .on("error", (err) => {
        console.error("❌ Error reading CSV:", err);
        mongoose.connection.close();
        reject(err);
      });
  });
}

seed();
