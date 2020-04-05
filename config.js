const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  databaseURL: process.env.DATABASEURL,
};
