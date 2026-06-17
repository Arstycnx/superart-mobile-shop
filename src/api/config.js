// เมื่อ Express serve ทั้ง frontend และ API บน port เดียวกัน
// ให้ใช้ relative URL เพื่อให้ทำงานได้ทุก port โดยไม่ต้อง hardcode
const API_URL = import.meta.env.VITE_API_URL ?? '';
export default API_URL;
