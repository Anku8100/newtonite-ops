
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const API = "http://localhost:5000/api/work-items";
const AUTH_API = "http://localhost:5000/api/auth/login";

let token;

test("login provides a token for authenticated API tests", async () => {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  assert.ok(email, "DEMO_USER_EMAIL must be set in server/.env");
  assert.ok(password, "DEMO_USER_PASSWORD must be set in server/.env");

  const response = await fetch(AUTH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  const result = await response.json();
  assert.ok(result.token, "Login should return a JWT token");
  token = result.token;
});

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

test("a work item can be claimed only once", async () => {
  assert.ok(token, "Login test must run first");

  const createResponse = await fetch(API, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      title: `Automated claim test ${Date.now()}`,
      description: "Created by automated test",
      priority: "HIGH",
    }),
  });

  assert.equal(createResponse.status, 201);
  const item = await createResponse.json();

  try {
    const firstClaim = await fetch(`${API}/${item.id}/claim`, {
      method: "PATCH",
      headers: authHeaders(),
    });

    assert.equal(firstClaim.status, 200);

    const claimedItem = await firstClaim.json();
    assert.equal(claimedItem.assignee, "Anku Kumari");
    assert.equal(claimedItem.version, item.version + 1);

    const staleResponse = await fetch(`${API}/${item.id}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        status: "AWAITING APPROVAL",
        expectedVersion: item.version,
      }),
    });

    assert.equal(staleResponse.status, 409);

    const secondClaim = await fetch(`${API}/${item.id}/claim`, {
      method: "PATCH",
      headers: authHeaders(),
    });

    assert.equal(secondClaim.status, 409);
  } finally {
    await fetch(`${API}/${item.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }
});

test("status API accepts valid transitions and rejects invalid statuses", async () => {
  assert.ok(token, "Login test must run first");

  const createResponse = await fetch(API, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
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
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        status: "IN PROGRESS",
        expectedVersion: item.version,
      }),
    });

    assert.equal(validResponse.status, 200);

    const updatedItem = await validResponse.json();
    assert.equal(updatedItem.status, "IN PROGRESS");
    assert.equal(updatedItem.version, item.version + 1);

    const invalidResponse = await fetch(`${API}/${item.id}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });

    assert.equal(invalidResponse.status, 400);
  } finally {
    await fetch(`${API}/${item.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }
});

test("members cannot access another team's work items", async () => {
  const suffix = `${Date.now()}-${Math.random()}`;
  let teamA;
  let teamB;
  let member;
  const itemIds = [];

  try {
    teamA = await prisma.team.create({
      data: { name: `Security Team A ${suffix}` },
    });

    teamB = await prisma.team.create({
      data: { name: `Security Team B ${suffix}` },
    });

    member = await prisma.user.create({
      data: {
        name: `Test Member ${suffix}`,
        email: `member-${suffix}@example.com`,
        role: "MEMBER",
        teamId: teamA.id,
      },
    });

    const ownItem = await prisma.workItem.create({
      data: {
        title: `Own team task ${suffix}`,
        teamId: teamA.id,
      },
    });
    itemIds.push(ownItem.id);

    const foreignItem = await prisma.workItem.create({
      data: {
        title: `Other team task ${suffix}`,
        teamId: teamB.id,
      },
    });
    itemIds.push(foreignItem.id);

    const memberToken = jwt.sign(
      { sub: String(member.id) },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const headers = {
      Authorization: `Bearer ${memberToken}`,
      "Content-Type": "application/json",
    };

    const listResponse = await fetch(API, { headers });
    assert.equal(listResponse.status, 200);

    const items = await listResponse.json();
    assert.ok(items.some((item) => item.id === ownItem.id));
    assert.ok(!items.some((item) => item.id === foreignItem.id));

    const claimResponse = await fetch(`${API}/${foreignItem.id}/claim`, {
      method: "PATCH",
      headers,
    });
    assert.equal(claimResponse.status, 403);

    const statusResponse = await fetch(`${API}/${foreignItem.id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "IN PROGRESS",
        expectedVersion: foreignItem.version,
      }),
    });
    assert.equal(statusResponse.status, 403);

    const activityResponse = await fetch(
      `${API}/${foreignItem.id}/activity`,
      { headers }
    );
    assert.equal(activityResponse.status, 403);
  } finally {
    if (itemIds.length > 0) {
      await prisma.activity.deleteMany({
        where: { workItemId: { in: itemIds } },
      });

      await prisma.workItem.deleteMany({
        where: { id: { in: itemIds } },
      });
    }

    if (member) {
      await prisma.user.delete({
        where: { id: member.id },
      });
    }

    if (teamA) {
      await prisma.team.delete({
        where: { id: teamA.id },
      });
    }

    if (teamB) {
      await prisma.team.delete({
        where: { id: teamB.id },
      });
    }
  }
});
