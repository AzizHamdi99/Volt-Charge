import mongoose from "mongoose";

export type ConnectorStatus = "available" | "occupied" | "fault";

export interface IConnector extends mongoose.Document {
  type: string;
  speed: string;
  status: ConnectorStatus;
  stationId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorSchema = new mongoose.Schema<IConnector>(
  {
    type: { type: String, required: true, trim: true },
    speed: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["available", "occupied", "fault"],
      default: "available",
      required: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
    },
  },
  { timestamps: true },
);

export const Connector =
  mongoose.models.Connector ||
  mongoose.model<IConnector>("Connector", ConnectorSchema);
