import axios from "axios";

export async function ocrVehicle(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post("/api/vehicle/ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}