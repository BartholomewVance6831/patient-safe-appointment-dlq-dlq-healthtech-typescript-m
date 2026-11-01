import assert from "node:assert/strict";
import test from "node:test";
import { decideRecovery } from "../src/dead_letter_policy.js";

test("holds a failed cancellation for human review", () => {
  const decision = decideRecovery({
    jobId: "job-204",
    appointmentId: "appt-91",
    operation: "cancel",
    attempts: 3,
    lastFailure: "downstream scheduling rejection",
    patientCommunicationPending: false,
  });

  assert.equal(decision.action, "manual_review");
  assert.match(decision.operationalNotification, /no patient action is requested/);
  assert.doesNotMatch(decision.operationalNotification, /appt-91|cancel/);
});

test("approves an operational reminder retry after review", () => {
  const decision = decideRecovery({
    jobId: "job-205",
    appointmentId: "appt-92",
    operation: "reminder",
    attempts: 2,
    lastFailure: "delivery rejected",
    patientCommunicationPending: false,
  });

  assert.equal(decision.action, "redrive");
});
