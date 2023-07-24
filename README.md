# Astro imgproxy Plugin

A plugin for adding [imgproxy](https://github.com/imgproxy/imgproxy) support to an Astro project in two parts:

1. Remark plugin for prepping special Markdown image URLs for imgproxy.
2. Standalone utilities for prepping imgproxy URLs in other contexts like Astro components.

## Setup

**`.env`**:

```shell
IMGPROXY_KEY="my-key"
IMGPROXY_SALT="my-salt"
IMGPROXY_BASE_URL="https://my-improxy-instance.foo"
```

**`astro.config.mjs`**:

```js
import imgproxy from "astro-imgproxy/remark";

export default defineConfig({
  // ...
  markdown: {
    // ...
    remarkPlugins: [imgproxy],
    // ...
  },
});
```

## Usage

Once you’ve installed the plugin and added environment variables for your imgproxy instance, you’ll need to add `?imgproxy` URL parameters to images you’d like to transform.

By default, no images in your project will be changed. Only those with the URL param will be prepped for imgproxy.

The URL param’s argument should be a comma-separated list of imgproxy [processing options](https://docs.imgproxy.net/generating_the_url?id=processing-options).

Check out the tests for example input and output.

## Examples

```md
![](https://files.mattstein.com/payload-dashboard.png?imgproxy=s:2400)
```

```html
<figure>
  <picture>
    <source
      srcset="
        https://files.mattstein.com/payload-dashboard.png?imgproxy=s:2400,f:avif,q:95
      "
      type="image/avif"
    />
    <source
      srcset="
        https://files.mattstein.com/payload-dashboard.png?imgproxy=s:2400,f:webp,q:95
      "
      type="image/webp"
    />
    <img
      src="https://files.mattstein.com/payload-dashboard.png?imgproxy=s:2400"
      class="rounded shadow-lg"
      data-zoomable
      alt="Screenshot of the Payload CMS browser UI, with a sidebar and main content area listing Collections and Globals."
    />
  </picture>
  <figcaption>
    The Payload dashboard with some of the collections I’m working on.
  </figcaption>
</figure>
```
