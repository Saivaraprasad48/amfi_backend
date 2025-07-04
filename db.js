const mongoose = require("mongoose");

async function connectToDatabase() {
  try {
    await mongoose.connect(
      "mongodb+srv://sai_vara_db:Dsvp%404904@cluster0.vf8la7o.mongodb.net/amfi"
    );
    console.log("Connected to DB");
  } catch (error) {
    console.error("Error connecting to DB:", error);
  }
}

connectToDatabase();

const navSchema = new mongoose.Schema(
  {
    scheme: String,
    nav: String,
    date: String,
    lastRefreshed: String,
  },
  { timestamps: true }
);

const NAVModel = mongoose.model("NAV", navSchema);

module.exports = {
  NAVModel,
};
