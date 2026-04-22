const Config = require("../models/Config");

const DEFAULT_MODE = "FACE"; // FACE, PALM, or BOTH

async function getRegistrationMode(req, res) {
  try {
    let modeConfig = await Config.findOne({ key: "registration_mode" });
    if (!modeConfig) {
      modeConfig = await Config.create({ key: "registration_mode", value: DEFAULT_MODE });
    }
    return res.status(200).json({ success: true, mode: modeConfig.value });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateRegistrationMode(req, res) {
  try {
    const { mode } = req.body;
    if (!["FACE", "PALM", "BOTH"].includes(mode)) {
      return res.status(400).json({ success: false, message: "Invalid mode." });
    }

    const modeConfig = await Config.findOneAndUpdate(
      { key: "registration_mode" },
      { value: mode },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, mode: modeConfig.value });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getRegistrationMode, updateRegistrationMode };
