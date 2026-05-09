import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  label?: string;
  description?: string;
  aspectRatio?: "square" | "video";
}

export function ImageUpload({ value, onChange, onRemove, label, description, aspectRatio = "square" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be less than 5MB" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onChange(data.url);
      toast({ title: "Image uploaded successfully" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: "Please try again later" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      {description && <p className="text-[0.8rem] text-muted-foreground">{description}</p>}
      
      <div className="flex items-center gap-4">
        {value ? (
          <div className={`relative rounded-lg overflow-hidden border bg-muted ${aspectRatio === "square" ? "w-24 h-24" : "w-full h-40"}`}>
            <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center border-2 border-dashed rounded-lg 
              cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20
              ${aspectRatio === "square" ? "w-24 h-24" : "w-full h-40"}
            `}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground font-medium">Upload</span>
              </>
            )}
          </div>
        )}
        
        {!value && aspectRatio === "square" && (
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground italic">Click to upload a PNG, JPG or WEBP image.</p>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
