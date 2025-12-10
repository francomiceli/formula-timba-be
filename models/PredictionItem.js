import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const PredictionItem = sequelize.define("PredictionItem", {
  position: { type: DataTypes.INTEGER, allowNull: false },
  pilotId: { type: DataTypes.INTEGER, allowNull: false },
});

export default PredictionItem;