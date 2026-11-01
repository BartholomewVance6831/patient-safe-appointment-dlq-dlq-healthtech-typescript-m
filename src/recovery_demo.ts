import { infrai } from "./infrai_queue.js";

const queue = process.env.APPOINTMENT_QUEUE ?? "appointment-workflows";
const deadLetters = await infrai.queue.dlq.list(queue);

console.log(JSON.stringify({ queue, deadLetters }, null, 2));
