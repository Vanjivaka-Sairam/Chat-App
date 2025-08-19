import { axiosInstance } from "./lib"

export const signup = async (signupData) => {
    const response = await axiosInstance.post("/auth/signup", signupData);
    return response.data;
}