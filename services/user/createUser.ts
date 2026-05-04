import { connectDB } from "@/libs/mongoose"
import { User, type UserRole } from "@/models/User";

interface UserData{
    name:string,
    email:string,
    keycloakId:string,
    role?: UserRole,
}

export async function createUser(data:UserData) {
    
    const {name,email,keycloakId, role = "user"}=data;
    
    if (!name || !email || !keycloakId) {
        throw new Error("Name, email and keycloakId are required");
    }

    await connectDB();
        const user = await User.findOneAndUpdate(
            { keycloakId },
            {
                $set: {
                    name,
                    email,
                    role,
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

    return user ;
    
}