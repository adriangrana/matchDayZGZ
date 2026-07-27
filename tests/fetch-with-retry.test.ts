import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithRetry } from "../src/services/fetch-with-retry";

test("no reintenta ni llama a la red cuando falla la reserva previa", async () => {
  let reservations = 0;

  await assert.rejects(
    () =>
      fetchWithRetry(
        "https://example.invalid",
        {},
        {
          retries: 1,
          beforeAttempt: () => {
            reservations += 1;
            throw new Error("almacenamiento no disponible");
          },
        },
      ),
    /almacenamiento no disponible/,
  );

  assert.equal(reservations, 1);
});
