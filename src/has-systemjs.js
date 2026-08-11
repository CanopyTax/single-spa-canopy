// A runtime check rather than a build flag, because this package ships prebuilt to npm
// and the same bundle has to work on a SystemJS page and a native import map page.
export function hasSystemJS() {
  return typeof SystemJS !== "undefined";
}
