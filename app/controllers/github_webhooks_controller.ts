import { DateTime } from "luxon";
import crypto from "node:crypto";

import type { HttpContext } from "@adonisjs/core/http";

import { toError } from "#app/helpers/error";
import GithubActivity from "#models/github_activity";
import env from "#start/env";
import { githubWebhookValidator } from "#validators/github_webhook";

function isValidHmacSignature(
  content: string | Buffer,
  receivedSignature: string,
  secret: string,
  algorithm = "sha256",
): boolean {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(content);
  const expectedSignature = hmac.digest("hex");

  const received = receivedSignature.replace(/^sha256=/, "");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(received, "hex"),
  );
}

export default class GithubWebhooksController {
  async webhook({ request, response, logger }: HttpContext) {
    const event = request.header("X-GitHub-Event");
    const signature = request.header("X-Hub-Signature-256");

    // validate request with signature
    if (signature === undefined) {
      logger.debug("GitHub webhook: Missing signature");
      return response.unauthorized("Missing signature");
    }

    // Get the raw body first for signature validation
    const rawBody = request.raw();
    if (rawBody === null) {
      logger.debug("GitHub webhook: Missing request body");
      return response.badRequest("Missing request body");
    }

    const secret = env.get("GITHUB_WEBHOOK_SECRET");
    if (!isValidHmacSignature(rawBody, signature, secret)) {
      logger.debug("GitHub webhook: Invalid signature");
      return response.unauthorized("Invalid signature");
    }

    // Parse the raw body as JSON for debugging and validation
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch (error) {
      logger.error(
        {
          err: toError(error),
          body: rawBody.toString(),
        },
        "GitHub webhook: Failed to parse JSON body",
      );
      return response.badRequest("Invalid JSON body");
    }

    // Add debugging BEFORE validation
    logger.debug({ body: parsedBody }, "Raw payload before validation");
    logger.debug({ repo: parsedBody.repository }, "Repository in raw payload");

    // Manually set the parsed body for validation since raw() might have consumed the stream
    request.updateBody(parsedBody);

    // handle event
    const payload = await request.validateUsing(githubWebhookValidator);

    // Add debugging AFTER validation
    logger.debug({ payload }, "Payload after validation");
    logger.debug(
      { repo: payload.repository.full_name },
      "Repository after validation",
    );

    const fullRepoName = payload.repository.full_name;

    if (event === undefined || fullRepoName.length === 0) {
      logger.debug(
        { event, fullRepoName },
        "GitHub webhook: Missing event header or repository data",
      );
      return response.badRequest("Missing event header or repository data.");
    }

    try {
      switch (event) {
        case "push": {
          const commits = payload.commits ?? [];
          const authorId = String(payload.sender.id);

          logger.debug(
            `GitHub webhook event: ${event}, user ${authorId} pushed ${
              commits.length
            } commits`,
          );

          for (const commit of commits) {
            const githubId = commit.id;
            const message = commit.message;
            const date = commit.timestamp;

            const exists = await GithubActivity.query()
              .where("githubId", githubId)
              .where("type", "commit")
              .first();

            if (exists === null) {
              await GithubActivity.create({
                githubId,
                type: "commit",
                message,
                authorGithubId: authorId,
                repo: fullRepoName,
                date: DateTime.fromISO(date),
              });
            }
          }
          break;
        }

        case "issues": {
          const issue = payload.issue ?? null;
          const action = payload.action ?? "";

          if (["opened", "edited"].includes(action) && issue !== null) {
            const githubId = issue.node_id;
            const authorId = String(issue.user.id);
            const message = issue.title;
            const date = issue.created_at;

            logger.debug(
              `GitHub webhook event: ${event}, user ${
                authorId
              } created/edited ${issue.title} issue`,
            );

            const exists = await GithubActivity.query()
              .where("githubId", githubId)
              .where("type", "issue")
              .first();

            if (exists === null) {
              await GithubActivity.create({
                githubId,
                type: "issue",
                message,
                authorGithubId: authorId,
                repo: fullRepoName,
                date: DateTime.fromISO(date),
              });
            }
          }
          break;
        }

        case "pull_request": {
          const pr = payload.pull_request ?? null;
          const action = payload.action ?? "";

          if (
            ["opened", "reopened", "edited"].includes(action) &&
            pr !== null
          ) {
            const githubId = pr.node_id;
            const authorId = String(pr.user.id);
            const message = pr.title;
            const date = pr.created_at;

            logger.debug(
              `GitHub webhook event: ${event}, user ${
                authorId
              } created/reopened/edited ${pr.title} pull request`,
            );

            const exists = await GithubActivity.query()
              .where("githubId", githubId)
              .where("type", "pr")
              .first();

            if (exists === null) {
              await GithubActivity.create({
                githubId,
                type: "pr",
                message,
                authorGithubId: authorId,
                repo: fullRepoName,
                date: DateTime.fromISO(date),
              });
            }
          }
          break;
        }

        case "pull_request_review": {
          const review = payload.review ?? null;
          if (review === null) {
            break;
          }

          const githubId = review.node_id;
          const authorId = String(review.user.id);
          const message = `Review state: ${review.state}`;
          const date = review.submitted_at;

          logger.debug(
            `GitHub webhook event: ${event}, user ${
              authorId
            } reviewed a pull request`,
          );

          const exists = await GithubActivity.query()
            .where("githubId", githubId)
            .where("type", "review")
            .first();

          if (exists === null) {
            await GithubActivity.create({
              githubId,
              type: "review",
              message,
              authorGithubId: authorId,
              repo: fullRepoName,
              date: DateTime.fromISO(date),
            });
          }
          break;
        }

        default:
          logger.info(`Unsupported github webhook event recieved: ${event}`);
          break;
      }

      return response.ok("Webhook processed.");
    } catch (error) {
      logger.error(
        { err: toError(error) },
        "GitHub webhook: Error processing webhook",
      );
      return response.internalServerError("Error processing GitHub webhook.");
    }
  }
}
