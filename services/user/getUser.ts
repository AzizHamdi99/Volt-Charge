import { connectDB } from "@/libs/mongoose";
import { User } from "@/models/User";

export async function getUser(keycloakId:string) {
    if(!keycloakId){
        throw new Error("keycloakId is required");
    }
    await connectDB();
    const user =await User.findOne({keycloakId})
    return user;
    
}