import { Router, type Request, type Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

router.post("/media/upload", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  const folder = (req.body.folder as string) || "dabba_uploads";

  try {
    const result = await uploadToCloudinary(req.file.buffer, folder);
    res.json({
      success: true,
      url: result.url,
      public_id: result.public_id,
    });
  } catch (err) {
    req.log.error({ err }, "Cloudinary upload error");
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
