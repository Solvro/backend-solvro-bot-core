/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import AutoSwagger from "adonis-autoswagger";

import router from "@adonisjs/core/services/router";

import swagger from "#config/swagger";

const GithubWebhooksController = () =>
  import("#controllers/github_webhooks_controller");
const OfficeCameraController = () =>
  import("#controllers/office_camera_controller");

const HealthChecksController = () =>
  import("#controllers/health_checks_controller");
const RecordingsController = () => import("#controllers/recordings_controller");

router.get("/", async () => {
  return {
    hello: "world",
  };
});

router.get("/swagger", async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger);
});

router.get("/docs", async () => {
  return AutoSwagger.default.scalar("/swagger");
});

router.get("/health", [HealthChecksController]);

router.patch("/recordings/:id", [RecordingsController, "register"]);
router.post("/recordings/:id/summary", [RecordingsController, "summary"]);

router.post("/office/camera", [OfficeCameraController, "update"]);

router.post("/webhook/github", [GithubWebhooksController, "webhook"]);
