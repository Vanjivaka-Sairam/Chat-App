import axios from "axios"

// Get API URL from environment variable or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const axiosInstance  = axios.create({
    baseURL : API_BASE_URL,
    withCredentials:true, //sends the cookies with request
})