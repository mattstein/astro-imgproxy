import { test, assert, expect } from "vitest";
import {
  isAbsoluteUrl,
  extractAbsoluteImageUrls,
  getUrlExtension,
} from "../src/index";

/**
 * Tests for lower-level URL detection and extraction.
 */

const validAbsoluteUrls = [
  "https://whatever.com/image.jpg",
  "https://whatever.com/image.png",
  "http://whatever.com/baz.webp",
  "https://whatever.com/foobar",
  "https://whatever.com/baz.webp?v=2",
];

const invalidAbsoluteUrls = [
  null,
  "",
  "image.png",
  "whatever.com/image.jpg",
  "/image.png",
  "foobar",
  "baz.webp?v=2",
  "//whatever.com/baz.webp", // now an anti-pattern
];

test("identifies absolute URLs", () => {
  validAbsoluteUrls.forEach((url) => {
    assert.isTrue(isAbsoluteUrl(url), `${url} should be valid`);
  });

  invalidAbsoluteUrls.forEach((url) => {
    assert.isFalse(isAbsoluteUrl(url), `${url} should not be valid`);
  });
});

test("extracts absolute URLs from Markdown", () => {
  const testString = `
  ![A](https://foo.bar/baz.png)
  ![B](https://foo.bar/baz-two.png)
  ![C](/not-absolute.png)
  `;

  expect(extractAbsoluteImageUrls(testString)).toMatchObject([
    "https://foo.bar/baz.png",
    "https://foo.bar/baz-two.png",
  ]);
});

test("extracts absolute URLs from Markup and Markdown", () => {
  const testString = `
  <figure>
    <picture>
      <source srcset="https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,f:avif,q:90" type="image/avif" />
      <source srcset="https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,f:webp,q:90" type="image/webp" />
      <img
        src="https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,q:90"
        width="1200"
        height="630"
        alt="The Mastodon server banner, which is some 3D “t00t.cloud” text in a moody blue field of light in cloudy fog"
      />
    </picture>
    <figcaption>The server banner I cobbled together with Blender.</figcaption>
  </figure>

  And some other text.

  ![Another image](https://files.mattstein.com/t00t.cloud-thumbnail.png?imgproxy=s:800)

  ![One more](https://files.mattstein.com/t00t.cloud-thumbnail-alt.png)
  `;

  const result = extractAbsoluteImageUrls(testString);

  expect(result).toMatchObject([
    "https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,f:avif,q:90",
    "https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,f:webp,q:90",
    "https://files.mattstein.com/t00t.cloud.png?imgproxy=s:1200,q:90",
    "https://files.mattstein.com/t00t.cloud-thumbnail.png?imgproxy=s:800",
    "https://files.mattstein.com/t00t.cloud-thumbnail-alt.png",
  ]);
});

test("extracts absolute URLs from srcset with sizes", () => {
  const testString = `
  <picture>
    <source srcset="https://example.dev/logo.png?imgproxy=s:400, https://example.dev/logo.png?imgproxy=s:600 1.5x" />
    <img src="https://example.dev/logo.png?imgproxy=f:png" alt="logo" />
  </picture>
  `;

  expect(extractAbsoluteImageUrls(testString)).toMatchObject([
    "https://example.dev/logo.png?imgproxy=s:400",
    "https://example.dev/logo.png?imgproxy=s:600",
    "https://example.dev/logo.png?imgproxy=f:png",
  ]);
});

test("correctly returns file extensions from URLs", () => {
  expect(getUrlExtension("https://foo.bar/baz.png")).toEqual("png");
  expect(getUrlExtension("https://foo.bar/baz.jpg")).toEqual("jpg");
  expect(getUrlExtension("https://sub.foo.bar/baz.gif")).toEqual("gif");
});
