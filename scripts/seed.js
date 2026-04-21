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
        // Mapping based on your specific CSV headers: empcode, name, desc
        if (row.empcode && row.name) {
          employees.push({
            EmployeeCode: row.empcode.trim().toUpperCase(),
            Name: row.name.trim(),
            Department: row.desc ? row.desc.trim() : "General",
            IsActive: true, // Default to true since not in CSV
          });
        }
      })
      .on("end", async () => {
        try {
          if (employees.length === 0) {
            console.log("⚠️ No employees found in CSV. Check headers.");
            mongoose.connection.close();
            return resolve();
          }

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
