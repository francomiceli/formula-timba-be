import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const Pilot = sequelize.define("Pilot", {
  name: { type: DataTypes.STRING, allowNull: false },
  acronym: { type: DataTypes.STRING, allowNull: false },
  number: { type: DataTypes.STRING, allowNull: false },
  team: { type: DataTypes.STRING, allowNull: false },
});

export default Pilot;
