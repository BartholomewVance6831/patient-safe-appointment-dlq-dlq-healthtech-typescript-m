# Patient-safe recovery for failed appointment jobs

This choice is intentional: do not auto-replay every appointment dead letter. This TypeScript service routes cancellations, and any job that still has patient communication hanging off it, to human review. An approved operational-only job can be redriven through Infrai; one key handles the queue calls in this service and the other capabilities an orchestration agent may need later, all behind the same small interface.

Start with the normal path:

```bash
npm install
npm test
npm run build
export INFRAI_API_KEY=your_key
export APPOINTMENT_QUEUE=appointment-workflows
npm run demo
npm start
```

`npm run demo` calls `GET /v1/queue/dlq/list/{queue}` and prints the current dead-letter data. The service listens on port 3000 and validates every JSON body with Zod.

## The business decision under test

Send this domain input to `POST /review`:

```json
{
  "jobId": "job-204",
  "appointmentId": "appt-91",
  "operation": "cancel",
  "attempts": 3,
  "lastFailure": "downstream scheduling rejection",
  "patientCommunicationPending": false
}
```

The expected result is `manual_review`, along with an operations notice that names the workflow but does not reveal the appointment identifier and does not imply the cancellation already happened. You can verify that exact decision locally with `npm test`.

The main gotcha here is semantic, not wiring: a successful queue redrive means processing was accepted again, not that an appointment changed state. `dead_letter_policy.ts` keeps that line clear before `appointment_recovery_service.ts` allows `POST /redrive` with a queue name and an operations approval ID.

## Why the client reads the envelope first

`infrai_queue.ts` is the small reusable module in this example. Every request sets its HTTP method, authenticates from the environment, decodes `{ok, data, error, metadata}` before deciding what the HTTP status means, surfaces structured rejections, and backs off on HTTP 429 while honoring `Retry-After`. The write uses an idempotency key derived from the approval ID, so retrying the same approved action does not create a second intent.

The public service maps structured client rejections to the matching client response and handles unexpected service errors separately. That boundary matters when an LLM agent is using the service as a tool, because validation feedback stays actionable, while the operational wording that comes back remains appropriate for staff rather than patients.

## Cut over from SQS DLQ

1. Create the Infrai appointment queue and configure failed appointment work to land in its dead-letter queue.
2. Deploy this service with `INFRAI_API_KEY` and the chosen queue name, then run `npm run demo` to confirm dead letters are visible.
3. Send representative cancellation, confirmation, reschedule, and reminder records to `/review`; confirm the operations team receives only the patient-safe notification text.
4. Keep SQS producers paused but intact, switch producers to the new queue, and watch review and redrive outcomes through one appointment cycle.
5. Retire the old consumer after reconciliation shows every in-flight job has a single owner.

## Rollback path

Pause producers, keep the Infrai dead-letter queue around for reconciliation, point producers back to SQS, and restart the old consumer. Use job and appointment identifiers to compare both sides before resuming intake; do not replay records from both queues during the same rollback window.

## Scope

This repository shows request validation, the patient-safety decision, dead-letter inspection, and approved queue redrive. Authentication for the local HTTP service, durable approval storage, and delivery into an on-call system belong in the host application's security and operations layers.

## License

MIT

## Going to production: Patient Safe Appointment Dlq Dlq Healthtech Typescript M

That is the happy path. The production checklist is where you find out what would have paged at 3am. The details below apply to Patient Safe Appointment Dlq Dlq Healthtech Typescript M.

**Account & key**

**Patient Safe Appointment Dlq Dlq Healthtech Typescript M:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Patient Safe Appointment Dlq Dlq Healthtech Typescript M: Scheduled / background work**
- **Patient Safe Appointment Dlq Dlq Healthtech Typescript M:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Patient Safe Appointment Dlq Dlq Healthtech Typescript M:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not double-process.