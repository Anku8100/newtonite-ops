
import test from "node:test";
import assert from "node:assert/strict";

const API = "http://localhost:5000/api/work-items";

test("a work item can be claimed only once", async () => {
  // Create a fresh test work item.
  const createResponse = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Automated claim test ${Date.now()}`,
      description: "Created by automated test",
      priority: "HIGH",
    }),
  });

  assert.equal(createResponse.status, 201);

  const item = await createResponse.json();

  try {
    // First claim should succeed.
    const firstClaim = await fetch(`${API}/${item.id}/claim`, {
      method: "PATCH",
    });

    assert.equal(firstClaim.status, 200);

    const claimedItem = await firstClaim.json();
    assert.equal(claimedItem.assignee, "Anku");

    // Second claim should be rejected.
    const secondClaim = await fetch(`${API}/${item.id}/claim`, {
      method: "PATCH",
    });

    assert.equal(secondClaim.status, 409);
  } finally {
    // Clean up the test item.
    await fetch(`${API}/${item.id}`, {
      method: "DELETE",
    });
  }
});

test("status API accepts valid statuses and rejects invalid ones", async () => {
  const createResponse = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Automated status test ${Date.now()}`,
      description: "Created by automated test",
      priority: "MEDIUM",
    }),
  });

  assert.equal(createResponse.status, 201);
  const item = await createResponse.json();

  try {
    const validResponse = await fetch(`${API}/${item.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN PROGRESS" }),
    });

    assert.equal(validResponse.status, 200);

    const updatedItem = await validResponse.json();
    assert.equal(updatedItem.status, "IN PROGRESS");

    const invalidResponse = await fetch(`${API}/${item.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });

    assert.equal(invalidResponse.status, 400);
  } finally {
    await fetch(`${API}/${item.id}`, { method: "DELETE" });
  }
});
