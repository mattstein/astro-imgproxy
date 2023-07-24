import { visit } from "unist-util-visit"
import {
  transformUrl,
  isImgproxyUrl,
  extractAbsoluteImageUrls,
} from "../imgproxy.js"

export default function imgproxy() {
  return (tree, { data }, done) => {
    /**
     * Markdown ![]()
     */
    visit(tree, "image", (node) => {
      if (node.url && isImgproxyUrl(node.url)) {
        const transformed = transformUrl(node.url)
        if (transformed) {
          node.url = transformed
        }
      }
    })

    /**
     * HTML in Markdown
     */
    visit(tree, "html", (node) => {
      if (node.value) {
        const absoluteUrls = extractAbsoluteImageUrls(node.value)

        absoluteUrls
          .filter((url) => {
            return isImgproxyUrl(url)
          })
          .map((absoluteUrl) => {
            const transformed = transformUrl(absoluteUrl)
            if (transformed) {
              node.value = node.value.replace(absoluteUrl, transformed)
            }
          })
      }
    })

    done()
  }
}
