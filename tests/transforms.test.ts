import { test, assert, expect } from "vitest";
import { transformUrl } from "../src/index";

/**
 * Tests for URL manipulation and transformation according to configuration.
 */

const config = {
  baseUrl: "https://imgproxy.test",
  key: "test",
  salt: "test",
  pathType: "plain",
};

test("transforms URL", () => {
  assert.equal(
    transformUrl(
      "https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,q:90",
      config
    ),
    "https://imgproxy.test/k7Jz1OFTwPgoXyLuwnTXPnVywf92isMhc4WUulbFTRo/s:1200/q:90/plain/https://files.mattstein.com/t00t.cloud.png"
  );
});

test("only removes imgproxy params", () => {
  assert.equal(
    transformUrl(
      "https://files.mattstein.com/t00t.cloud.png?version=123&imgproxy=s:1200,q:90",
      config
    ),
    "https://imgproxy.test/yxzKG5TeUhPdYWizJUbFt4KkspP2uvpWp_l7TVxkBrw/s:1200/q:90/plain/https://files.mattstein.com/t00t.cloud.png?version=123"
  );
});

test("ignores URL without imgproxy params", () => {
  expect(() => {
    transformUrl(
      "https://files.mattstein.com/t00t.cloud.png?version=123",
      config
    );
  }).toThrowError(
    `'https://files.mattstein.com/t00t.cloud.png?version=123' can’t be prepared for imgproxy.`
  );
});

test("complains about missing baseUrl", () => {
  expect(() => {
    transformUrl("https://foo/bar.png?imgproxy=s:1200,q:90", { baseUrl: null });
  }).toThrowError(`imgproxy baseUrl, key, and salt are required.`);
});

test("complains about missing key", () => {
  expect(() => {
    transformUrl("https://foo/bar.png?imgproxy=s:1200,q:90", { key: null });
  }).toThrowError(`imgproxy baseUrl, key, and salt are required.`);
});

test("complains about missing salt", () => {
  expect(() => {
    transformUrl("https://foo/bar.png?imgproxy=s:1200,q:90", { salt: null });
  }).toThrowError(`imgproxy baseUrl, key, and salt are required.`);
});
