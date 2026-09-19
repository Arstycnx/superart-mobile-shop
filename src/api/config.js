const API_URL = import.meta.env.VITE_API_URL || 'http://10.80.231.125:3011';

// รูป/สลิปอาจเป็น URL เต็มจาก Cloudinary หรือ path สัมพัทธ์จาก disk storage เดิม
export const resolveFileUrl = (value) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/uploads')) return `${API_URL}${value}`;
    return `${API_URL}/uploads/repairs/${value}`;
};

export default API_URL;
