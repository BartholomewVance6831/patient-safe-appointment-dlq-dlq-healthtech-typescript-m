import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { appointmentDeadLetterSchema, decideRecovery } from "./dead_letter_policy.js";
import { InfraiError, infrai } from "./infrai_queue.js";

const redriveSchema = z.object({
  queue: z.string().min(1).regex(/^[A-Za-z0-9._-]+$/),
  approvalId: z.string().min(1),
});

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/review") {
      const job = appointmentDeadLetterSchema.parse(await readJson(request));
      send(response, 200, { jobId: job.jobId, decision: decideRecovery(job) });
      return;
    }

    if (request.method === "POST" && request.url === "/redrive") {
      const input = redriveSchema.parse(await readJson(request));
      const result = await infrai.queue.dlq.redrive(
        input.queue,
        `appointment-redrive:${input.approvalId}`,
      );
      send(response, 202, { status: "accepted", result });
      return;
    }

    send(response, 404, { error: "route_not_found", requestId: randomUUID() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      send(response, 400, { error: "invalid_request", issues: error.issues });
    } else if (error instanceof SyntaxError) {
      send(response, 400, { error: "invalid_json" });
    } else if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.detail, requestId: randomUUID() });
    } else {
      send(response, 500, { error: "service_error", requestId: randomUUID() });
    }
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Appointment recovery service listening on ${port}`));
}
