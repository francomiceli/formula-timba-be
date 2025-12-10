import { DataTypes } from "sequelize";
import sequelize from "../database.js";
import PredictionItem from "./PredictionItem.js";

const Prediction = sequelize.define("Prediction", {
  userName: { type: DataTypes.STRING, allowNull: false },
  raceName: { type: DataTypes.STRING, allowNull: false },
});

Prediction.hasMany(PredictionItem, { as: "items", foreignKey: "predictionId" });

export default Prediction;
