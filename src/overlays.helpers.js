export function getAppName (props) {
  return props.name || props.appName || props.childAppName
}

const overlayDivClassName = `cp-single-spa-canopy__overlay--div`;

// We will only add the event listener if it isn't already defined and certain localStorage variables are set to true
if (!window._overlayListenerDefined && canDevOverlayBeTurnedOn()) {
  window.addEventListener('keypress', function (evt) {
    if ((evt.key === '~' || evt.key === '`') && evt.shiftKey && evt.ctrlKey) {
      localStorage.setItem('cp:single-spa:overlay', !JSON.parse(localStorage.getItem('cp:single-spa:overlay')))
      window.dispatchEvent(new CustomEvent('cp:show-overlay-keypress'))
    }
  })
  window._overlayListenerDefined = true
}

// We don't want our customers to ever see the dev overlay. This will prevent the eventListener from even being created
//  without the correct localStorage varables being set.
function canDevOverlayBeTurnedOn () {
  if (typeof localStorage === 'undefined') {
    return false
  } else {
    return localStorage.getItem('sofe-inspector') === 'true' || localStorage.getItem('cp:dev-overlay') === 'true'
  }
}

export function setOrRemoveAllOverlays(rootElement, opts, props) {
  const overlayEnabled = localStorage.getItem('cp:single-spa:overlay') === 'true'

  clearInterval(opts.overlay._interval)
  if (overlayEnabled) {
    opts.overlay._interval = setInterval(() => {
      immediatelySetOrRemoveAllOverlays(rootElement, opts, props, overlayEnabled)
    }, 250)
    setTimeout(() => {
      clearInterval(opts.overlay._interval)
    }, 2000)
  } else {
    immediatelySetOrRemoveAllOverlays(rootElement, opts, props, overlayEnabled)
  }
}

function immediatelySetOrRemoveAllOverlays(rootElement, opts, props, overlayEnabled) {
  setOrRemoveOverlay(rootElement, overlayEnabled, opts, props, [overlayDivClassName, 'rootElement']);
  const selectorNodeLists = opts.overlay.selectors.map(selector => rootElement.querySelectorAll(selector));

  selectorNodeLists.forEach(selectorNodeList => {
    for (let i=0; i<selectorNodeList.length; i++) {
      setOrRemoveOverlay(selectorNodeList[i], overlayEnabled, opts, props, [overlayDivClassName]);
    }
  });
}

function setOrRemoveOverlay(element, overlayEnabled, opts, props, classes) {
  let overlayDiv = element.querySelector("." + classes.join('.'));
  if (!overlayDiv) {
    overlayDiv = createOverlayWithText(opts, props, element, classes);
  }

  if (overlayEnabled) {
    overlayDiv.style.display = 'block'

    if (overlayDiv.parentElement.clientHeight > 0 && overlayDiv.parentElement.clientWidth > 0) {
      overlayDiv.childDiv.style.visibility = 'visible'
    } else {
      overlayDiv.childDiv.style.visibility = 'hidden'
    }
  } else {
    overlayDiv.style.display = 'none'
  }
}

function getColorFromString (string, opacity = 0.1) {
  const hex = getHexFromString(string)
  return getRGBAFromHex(hex, opacity)
}

function getHexFromString (string) {
  let result = (parseInt(
    parseInt(string, 36)
      .toExponential()
      .slice(2, -5)
  , 10) & 0XFFFFFF).toString(16).toUpperCase()
  return result.split('').concat([0,0,0,0,0,0]).slice(0,6).join('')
}

function getRGBAFromHex (hex, opacity = 0.1) {
  const rgba = [`0x${hex.slice(0, 2)}`, `0x${hex.slice(2, 4)}`, `0x${hex.slice(4, 6)}`]
  return `rgba(${parseInt(rgba[0])}, ${parseInt(rgba[1])}, ${parseInt(rgba[2])}, ${opacity})`
}

function createOverlayWithText (opts, props, elementToAppendChild, classes) {
  if (!elementToAppendChild) {
    return null
  }
  const div = elementToAppendChild.appendChild(document.createElement('div'))
  div.className = classes.join(" ");
  div.style.width = opts.overlay.width || '100%'
  div.style.height = opts.overlay.height || '100%'
  div.style.zIndex = opts.overlay.zIndex || 40
  div.style.position = opts.overlay.position || 'absolute'
  div.style.top = opts.overlay.top || 0
  div.style.left = opts.overlay.left || 0
  div.style.pointerEvents = 'none'
  let backgroundColor
  const hexRegex = /^#[A-Fa-f0-9]{6}$/g
  if (opts.overlay.color && hexRegex.test(opts.overlay.color)) {
    backgroundColor = getRGBAFromHex(opts.overlay.color.replace('#', ''))
  } else if (opts.overlay.background) {
    backgroundColor = opts.overlay.background
  } else {
    backgroundColor = getColorFromString(getAppName(props))
  }
  div.style.background = backgroundColor

  const childDiv = div.appendChild(document.createElement('div'))
  childDiv.style.display = 'flex'
  childDiv.style.flexDirection = elementToAppendChild.clientHeight > 80 ? 'column' : 'row';
  childDiv.style.alignItems = 'center'
  childDiv.style.justifyContent = 'center'
  childDiv.style.color = opts.overlay.color || opts.overlay.textColor || getColorFromString(getAppName(props), 1)
  childDiv.style.fontWeight = 'bold'
  childDiv.style.height = '100%'
  childDiv.style.fontSize = '32px'
  const appNameDiv = document.createElement('div');
  appNameDiv.appendChild(document.createTextNode(getAppName(props)));
  childDiv.appendChild(appNameDiv);

  SystemJS
    .import('error-logging!sofe')
    .then(sentry => {
      if (typeof sentry.serviceNameToSquad === 'function') {
        const squadDiv = document.createElement('div');
        squadDiv.appendChild(document.createTextNode(`(${sentry.serviceNameToSquad(getAppName(props))} squad)`));
        squadDiv.style.marginLeft = '2px';
        childDiv.appendChild(squadDiv);
      }
    })
    .catch(err => {
      setTimeout(() => {
        throw err;
      })
    });

  div.childDiv = childDiv;

  return div
}
