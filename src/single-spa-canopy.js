import deepMerge from "deepmerge";
import { setOrRemoveAllOverlays, getAppName } from "./overlays.helpers.js";

const defaultOpts = {
  domElementGetter: null,
  position: "relative",
  overlay: {
    selectors: [],
  },
};

export default function singleSpaCanopy(userOpts) {
  if (typeof userOpts !== "object") {
    throw new Error(`single-spa-canopy requires an opts object`);
  }

  const opts = deepMerge(defaultOpts, userOpts);

  return {
    bootstrap: bootstrap.bind(null, opts),
    mount: mount.bind(null, opts),
    unmount: unmount.bind(null, opts),
    unload: unload.bind(null, opts),
  };
}

function getUrl(props) {
  // Helper to resolve module URL from import map
  function resolveModuleUrl(moduleName) {
    const importMap = document.querySelector('script[type="importmap"]');
    if (importMap) {
      const map = JSON.parse(importMap.textContent);
      return map.imports[moduleName] || moduleName;
    }
    return moduleName;
  }

  const moduleName = `@canopytax/${getAppName(props)}`;
  return Promise.resolve(resolveModuleUrl(moduleName));
}

function isOverridden(props) {
  // sofe returns false anyways
  return Promise.resolve(false);
}

function bootstrap(opts, props) {
  return Promise.resolve().then(() => {
    const blockingPromises = [];
    const moduleName = `@canopytax/${getAppName(props)}`;

    blockingPromises.push(
      Promise.all([getUrl(props), isOverridden(props)]).then(([url]) => {
        if (window.Raven) {
          window.Raven.setTagsContext({
            [getAppName(props)]: url,
          });
        }
      }),
    );

    return Promise.all(blockingPromises);
  });
}

function mount(opts, props) {
  return Promise.resolve().then(() => {
    let overlayArray = [];
    if (opts.domElementGetter) {
      const el = getDomEl(opts);
      el.style.position = opts.position;
      window.addEventListener("cp:show-overlay-keypress", toggleOverlays);
      window.addEventListener("single-spa:routing-event", toggleOverlays);

      opts.overlay._toggleOverlays = toggleOverlays;

      function toggleOverlays() {
        setOrRemoveAllOverlays(el, opts, props);
      }
    }
  });
}

function unmount(opts) {
  return Promise.resolve().then(() => {
    window.removeEventListener(
      "cp:show-overlay-keypress",
      opts.overlay._toggleOverlays,
    );
    window.removeEventListener(
      "single-spa:routing-event",
      opts.overlay._toggleOverlays,
    );
  });
}

function unload() {
  // ESM modules are cached by the browser, no manual cleanup needed
  return Promise.resolve();
}

function attemptDeleteDomNode(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  } else {
    element.parentNode.removeChild(element);
    return true;
  }
}

function getDomEl(opts) {
  const el = opts.domElementGetter();
  if (!el) {
    throw new Error(
      `single-spa-canopy: domElementGetter did not return a valid DOM element`,
    );
  }

  return el;
}
