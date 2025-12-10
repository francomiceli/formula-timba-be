import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const Race = sequelize.define("Race", {
  name: { type: DataTypes.STRING, allowNull: false },
  round: { type: DataTypes.INTEGER, allowNull: false },
});

export default Race;