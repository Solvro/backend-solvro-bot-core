import fs from "node:fs/promises";
import path from "node:path";

import { inject } from "@adonisjs/core";
import { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";

import { OfficeCameraService } from "#services/office_camera_service";
import env from "#start/env";
import { officeCameraPollValidator } from "#validators/office_camera";

@inject()
export default class OfficeCameraController {
  constructor(protected officeCameraService: OfficeCameraService) {}

  async update({ request, response }: HttpContext) {
    const {
      count,
      timestamp,
      file: image,
    } = await request.validateUsing(officeCameraPollValidator);

    // Handle image (if provided)
    const imageDir = env.get("OFFICE_CAMERA_IMAGE_PATH");
    const imageName = "latest.jpg";
    const fullImagePath = path.join(imageDir, imageName);

    if (image) {
      try {
        await fs.mkdir(imageDir, { recursive: true });
        // Replace old image with the new one
        await image.move(imageDir, { name: imageName, overwrite: true });

        this.officeCameraService.updateStatusMessages(
          count,
          timestamp,
          fullImagePath,
        );

        logger.debug(`Image saved to: ${fullImagePath}`);
      } catch (err) {
        logger.error("Failed to save image:", err);
      }
    } else {
      this.officeCameraService.updateStatusMessages(count, timestamp);
    }

    response.status(201);
  }
}
