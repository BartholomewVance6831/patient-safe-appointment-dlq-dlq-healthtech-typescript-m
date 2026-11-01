import { z } from "zod";

export const appointmentDeadLetterSchema = z.object({
  jobId: z.string().min(1),
  appointmentId: z.string().min(1),
  operation: z.enum(["confirm", "reschedule", "cancel", "reminder"]),
  attempts: z.number().int().nonnegative(),
  lastFailure: z.string().min(1),
  patientCommunicationPending: z.boolean(),
});

export type AppointmentDeadLetter = z.infer<typeof appointmentDeadLetterSchema>;

export type RecoveryDecision = {
  action: "manual_review" | "redrive";
  reason: string;
  operationalNotification: string;
};

export function decideRecovery(job: AppointmentDeadLetter): RecoveryDecision {
  if (job.patientCommunicationPending || job.operation === "cancel") {
    return {
      action: "manual_review",
      reason: "A person must verify appointment state before another patient-facing attempt.",
      operationalNotification: `Appointment workflow ${job.jobId} needs operations review; no patient action is requested.`,
    };
  }

  return {
    action: "redrive",
    reason: "The workflow is operational-only and may be retried after review.",
    operationalNotification: `Appointment workflow ${job.jobId} is approved for queue recovery.`,
  };
}
