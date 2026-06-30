import { DateTime } from "luxon";
import crypto from "node:crypto";

import type { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";

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
  async webhook({ request, response }: HttpContext) {
    const event = request.header("X-GitHub-Event");
    const signature = request.header("X-Hub-Signature-256");

    // validate request with signature
    if (signature === undefined) {
      logger.debug("Github webhook: Missing signature");
      return response.unauthorized("Missing signature");
    }

    // Get the raw body first for signature validation
    const rawBody = request.raw();
    if (rawBody === null) {
      logger.debug("Github webhook: Missing request body");
      return response.badRequest("Missing request body");
    }

    const secret = env.get("GITHUB_WEBHOOK_SECRET");
    if (!isValidHmacSignature(rawBody, signature, secret)) {
      logger.debug("Github webhook: Invalid signature");
      return response.unauthorized("Invalid signature");
    }

    // Parse the raw body as JSON for debugging and validation
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch (error) {
      logger.error("Github webhook: Failed to parse JSON body", error);
      return response.badRequest("Invalid JSON body");
    }

    // Add debugging BEFORE validation
    logger.debug("Raw payload before validation:", JSON.stringify(parsedBody));
    logger.debug("Repository in raw payload:", parsedBody.repository);

    // Manually set the parsed body for validation since raw() might have consumed the stream
    request.updateBody(parsedBody);

    // handle event
    const payload = await request.validateUsing(githubWebhookValidator);

    // Add debugging AFTER validation
    logger.debug("Payload after validation:", JSON.stringify(payload));
    logger.debug("Repository after validation:", payload.repository.full_name);

    const fullRepoName = payload.repository.full_name;

    if (event === undefined || fullRepoName.length === 0) {
      logger.debug("Github webhook: Missing event header or repository data.");
      logger.debug("Event:", event);
      logger.debug("Full repo name:", fullRepoName);
      return response.badRequest("Missing event header or repository data.");
    }

    try {
      switch (event) {
        case "push": {
          const commits = payload.commits ?? [];
          const authorId = payload.sender.id;

          logger.debug(
            `Github webhook event: ${event}, user ${authorId} pushed ${
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
            const authorId = issue.user.id;
            const message = issue.title;
            const date = issue.created_at;

            logger.debug(
              `Github webhook event: ${event}, user ${
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
            const authorId = pr.user.id;
            const message = pr.title;
            const date = pr.created_at;

            logger.debug(
              `Github webhook event: ${event}, user ${
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
          const authorId = review.user.id;
          const message = `Review state: ${review.state}`;
          const date = review.submitted_at;

          logger.debug(
            `Github webhook event: ${event}, user ${
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
      logger.error(error);
      return response.internalServerError("Error processing GitHub webhook.");
    }
  }
}
