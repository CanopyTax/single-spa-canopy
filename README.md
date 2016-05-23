# single-spa-canopy
Some helpers for single-spa child apps at canopy

## Usage

```js
import singleSpaCanopy from 'single-spa-canopy';

const canopyLifecycles = singleSpaCanopy({
  mainContentTransition: true,
  domElementGetter: () => document.getElementById('main-content'),
  childAppName: 'workflow-ui!sofe',
});

export const bootstrap = [
  canopyLifecycles.bootstrap,
];

export const mount = [
  canopyLifecycles.mount,
];

export const unmount = [
  canopyLifecycles.unmount,
];
```

## Options

- `mainContentTransition`: (optional) A boolean value that defaults to true. If set to true, the three dots animation will show up when transitioning between apps
- `domElementGetter`: (optional) A function that returns the dom element in which the child app will be mounted. This is required if `mainContentTransition` is true.
- `childAppName`: (required) A string, that includes the `!sofe` at the end. This is the name by which the child app can be SystemJS.imported.
