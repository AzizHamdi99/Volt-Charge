import { Document } from "mongoose";
import mongoose from "mongoose"

export type UserRole = "admin" | "user";

export interface IUser extends Document{
    name:string,
    email:string,
    keycloakId:string,
    role: UserRole,
    createdAt:Date,
    updatedAt:Date,
}

const UserSchema= new mongoose.Schema<IUser>(
    {
        name:{
            type:String,
            required:true
        },
        email:{
            type:String,
            required:true,
            unique:true    
        },
        keycloakId:{
            type:String,
            required:true,
            unique:true
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
            required: true,
        }


},{
    timestamps:true
});

export const User=mongoose.models.User|| mongoose.model<IUser>("User",UserSchema)