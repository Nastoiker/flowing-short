import axios from "axios";

export async  function getCategory(alias) {
  try {
    const res = await axios.get((process.env.API_INTERNAL_URL || "http://127.0.0.1:8000") + "/Video/category/:" + encodeURIComponent(alias), { timeout: 5000 });
    return await res.data;
  } catch (e) {
    console.log(e.message);
    return null
  }
}
