const mongoose = require("mongoose");
exports.mongodb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Mongodb ulandi");
  } catch (e) {
    console.error(`Mongodb xatosi: ${e.message}`);
    process.exit(1);
  }
};
