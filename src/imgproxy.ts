import createHmac from "create-hmac";
import dotenv from "dotenv";

dotenv.config();

/**
 * Extracts absolute image URLs from the supplied string of markup or Markdown.
 *
 * @param {string} haystack HTML or Markdown that may contain image URLs with imgproxy params
 * @returns array
 */
export const extractAbsoluteImageUrls = (haystack: string) => {
  const absoluteImageUrls = [];

  if (haystack && haystack.includes("<img")) {
    const srcMatch = new RegExp(/(src)="(\S*)"/g);
    const srcMatches = [...haystack.matchAll(srcMatch)];

    srcMatches.map((match) => {
      const src = match[2];
      if (isAbsoluteUrl(src)) {
        absoluteImageUrls.push({ index: match.index, url: src });
      }
    });

    if (haystack.includes("srcset")) {
      const srcsetMatch = new RegExp(/(srcset)="([^"]*)"/g);
      const srcsetMatches = [...haystack.matchAll(srcsetMatch)];

      srcsetMatches.map((match) => {
        const srcset = match[2];

        if (srcset.includes(", ")) {
          // Source values are separated by commas
          const sources = srcset.split(", ");

          sources.map((source, index) => {
            const sourceParts = source.split(" ");
            // There may or may not be a corresponding size, but the URL will always come first
            const url = sourceParts[0];

            if (isAbsoluteUrl(url)) {
              absoluteImageUrls.push({ index: match.index + index, url });
            }
          });
        } else {
          if (isAbsoluteUrl(srcset)) {
            absoluteImageUrls.push({ index: match.index, url: srcset });
          }
        }
      });
    }
  }

  if (haystack && haystack.includes("![")) {
    const srcMatch = new RegExp(/\!\[[^\]]*\]\((.*?)\)/g);
    const matches = [...haystack.matchAll(srcMatch)];

    matches.map((match) => {
      const src = match[1];
      if (isAbsoluteUrl(src)) {
        absoluteImageUrls.push({ index: match.index, url: src });
      }
    });
  }

  return (
    absoluteImageUrls
      // sort by original found position so results are in the right order
      .sort(function (a, b) {
        return a.index - b.index;
      })
      // discard index and only return URLs
      .map((item) => {
        return item.url;
      })
  );
};

/**
 * Takes a URL with imgproxy transform options in its params and returns it
 * transformed for the configured imgproxy endpoint.
 *
 * Returns `false` if the source URL doesn’t contain imgproxy params.
 *
 * @param {string} sourceUrl
 * @param {object} config
 * @returns string
 */
export const transformUrl = (sourceUrl, config = {}) => {
  if (!isImgproxyUrl(sourceUrl)) {
    throw new Error(`'${sourceUrl}' can’t be prepared for imgproxy.`);
  }

  const url = new URL(sourceUrl);
  let imgproxyParams = url.searchParams.get("imgproxy");

  const [cleanedSource, transformed] = cleanAndTransform(
    sourceUrl,
    imgproxyParams,
    config
  );

  return transformed;
};

/**
 * Strips imgproxy params from a URL, and transforms that URL
 * for the configured imgproxy instance.
 *
 * @param {string} url     Source URL
 * @param {string} params
 * @param {object} config
 * @returns
 */
export const cleanAndTransform = (url, params, config = {}) => {
  const defaults = {
    baseUrl: process.env.IMGPROXY_BASE_URL,
    key: process.env.IMGPROXY_KEY,
    salt: process.env.IMGPROXY_SALT,
    pathType: "base64", // or 'plain'
  };

  const settings = { ...defaults, ...config };

  if (!settings.baseUrl || !settings.key || !settings.salt) {
    throw new Error("imgproxy baseUrl, key, and salt are required.");
  }

  const urlSafeBase64 = (string) => {
    return Buffer.from(string)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const hexDecode = (hex) => Buffer.from(hex, "hex");

  const sign = (salt, target, secret) => {
    const hmac = createHmac("sha256", hexDecode(secret));
    hmac.update(hexDecode(salt));
    hmac.update(target);
    return urlSafeBase64(hmac.digest());
  };

  // remove imgproxy key+value
  let cleanedUrl = url.replace(`imgproxy=${params}`, "");

  // remove the question mark if there were no other URL params, or ending ampersand
  if (cleanedUrl.endsWith("?") || cleanedUrl.endsWith("&")) {
    cleanedUrl = cleanedUrl.slice(0, -1);
  }

  // replace URL-param-friendly commas with slashes imgproxy expects
  params = params.replaceAll(",", "/");

  const pathParts = [`/${params}`];

  if (settings.pathType === "base64") {
    const outputFormat = getOutputFormatFromParams(params);
    const originalExtension = getUrlExtension(cleanedUrl);
    const outputExtension = outputFormat.length
      ? outputFormat
      : originalExtension;
    pathParts.push(urlSafeBase64(cleanedUrl) + `.${outputExtension}`);
  } else {
    pathParts.push("plain", cleanedUrl);
  }

  const path = pathParts.join("/");
  const signature = sign(settings.salt, path, settings.key);
  const transformUrl = `${settings.baseUrl}/${signature}${path}`;

  return [cleanedUrl, transformUrl];
};

/**
 * Returns `true` if the given URL can be rewritten for imgproxy.
 *
 * @param {string} sourceUrl
 * @returns boolean
 */
export const isImgproxyUrl = (sourceUrl) => {
  if (!isAbsoluteUrl(sourceUrl)) {
    return false;
  }

  const url = new URL(sourceUrl);
  let imgproxyParams = url.searchParams.get("imgproxy");

  if (!imgproxyParams) {
    return false;
  }

  return true;
};

/**
 * Returns `true` if the supplied string starts with `http://` or `https://`.
 * @param {*} url
 * @returns boolean
 */
export const isAbsoluteUrl = (url: string | null) => {
  return (
    url !== "" &&
    url !== null &&
    (url.startsWith("https://") || url.startsWith("http://"))
  );
};

/**
 * Returns the file extension from a given URL.
 *
 * Assumes the URL has already been stripped of any query params!
 *
 * @param {string} url
 * @returns
 */
export const getUrlExtension = (url: string) => {
  if (!url) {
    return;
  }

  const parts = url.split(/[#?]/);

  if (!parts || !parts.length) {
    return;
  }

  return parts[0].split(".").pop().trim();
};

const getOutputFormatFromParams = (params) => {
  const segments = params.split("/");

  return segments
    .filter((segment) => {
      return (
        segment.startsWith("format:") ||
        segment.startsWith("f:") ||
        segment.startsWith("ext:")
      );
    })
    .map((segment) => {
      const pieces = segment.split(":");
      return pieces[1];
    });
};
