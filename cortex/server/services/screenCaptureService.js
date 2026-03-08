import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const execAsync = promisify(exec);

export class ScreenCaptureService {
  constructor() {
    this.platform = process.platform;
    this.tempDir = path.join(process.cwd(), "tmp", "screenshots");

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    console.log(`[SCREEN_CAPTURE] Initialized for platform: ${this.platform}`);
  }

  async capture() {
    try {
      if (this.platform === "darwin") return await this.captureMacOS();
      if (this.platform === "win32") return await this.captureWindows();
      if (this.platform === "linux") return await this.captureLinux();
      return {
        success: false,
        platform: this.platform,
        error: "Unsupported platform",
      };
    } catch (error) {
      return { success: false, platform: this.platform, error: error.message };
    }
  }

  async captureMacOS() {
    const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
    try {
      await execAsync(`screencapture -x -t png -T 0 "${imagePath}"`);
      if (!fs.existsSync(imagePath)) throw new Error("File not created");
      const imageBuffer = fs.readFileSync(imagePath);
      return { success: true, imageBuffer, imagePath, platform: "darwin" };
    } catch (error) {
      const isPermissionError = error.message.includes("Service not allowed");
      return {
        success: false,
        platform: "darwin",
        error: isPermissionError ? "Permission required" : error.message,
        fix: isPermissionError
          ? "Check Screen Recording permissions"
          : undefined,
      };
    }
  }

  async captureWindows() {
    const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
    try {
      const psCommand = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen(0,0,0,0, $bmp.Size); $bmp.Save('${imagePath}', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bmp.Dispose();`;
      await execAsync(`powershell -Command "${psCommand}"`);
      const imageBuffer = fs.readFileSync(imagePath);
      return { success: true, imageBuffer, imagePath, platform: "win32" };
    } catch (error) {
      return { success: false, platform: "win32", error: error.message };
    }
  }

  async captureLinux() {
    const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
    try {
      await execAsync(`import -window root "${imagePath}"`);
      const imageBuffer = fs.readFileSync(imagePath);
      return { success: true, imageBuffer, imagePath, platform: "linux" };
    } catch (error) {
      return { success: false, platform: "linux", error: error.message };
    }
  }

  async hasScreenChanged(newImageBuffer) {
    const newHash = crypto
      .createHash("md5")
      .update(newImageBuffer)
      .digest("hex");
    const changed = newHash !== this.lastCaptureHash;
    this.lastCaptureHash = newHash;
    return changed;
  }

  imageBufferToBase64(buffer) {
    return buffer.toString("base64");
  }

  cleanupOldScreenshots() {
    try {
      const files = fs
        .readdirSync(this.tempDir)
        .filter((f) => f.startsWith("screenshot_"))
        .map((f) => ({
          name: f,
          path: path.join(this.tempDir, f),
          time: fs.statSync(path.join(this.tempDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);
      if (files.length > 10) {
        files.slice(10).forEach((f) => fs.unlinkSync(f.path));
      }
    } catch (e) {
      console.warn("[SCREEN_CAPTURE] Cleanup failed:", e);
    }
  }
}

export const screenCaptureService = new ScreenCaptureService();
// No default export needed if using named export, but consistent with existing pattern
export default screenCaptureService;
