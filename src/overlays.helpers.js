const overlayDivClassName = `cp-single-spa-canopy__overlay--div`;

if (!window._overlayListenerDefined) {
	window.addEventListener('keypress', function (evt) {
		if (evt.key === 'D' && evt.shiftKey && evt.ctrlKey) {
			localStorage.setItem('cp:single-spa:overlay', !JSON.parse(localStorage.getItem('cp:single-spa:overlay')))
			window.dispatchEvent(new CustomEvent('cp:show-overlay-keypress'))
		}
	})
	window._overlayListenerDefined = true
}

export function toggleAllOverlays(rootElement, opts) {
	const overlayEnabled = localStorage.getItem('cp:single-spa:overlay') === 'true' && localStorage.getItem('sofe-inspector') === 'true';
	toggleOverlay(rootElement, overlayEnabled, opts, [overlayDivClassName, 'rootElement']);

	const selectorNodeLists = opts.overlay.selectors.map(selector => rootElement.querySelectorAll(selector));
	selectorNodeLists.forEach(selectorNodeList => {
		for (let i=0; i<selectorNodeList.length; i++) {
			toggleOverlay(selectorNodeList[i], overlayEnabled, opts, [overlayDivClassName]);
		}
	});
}

function toggleOverlay(element, overlayEnabled, opts, classes) {
	let overlayDiv = element.querySelector("." + classes.join('.'));
	if (!overlayDiv) {
		overlayDiv = createOverlayWithText(opts, element, classes);
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

function createOverlayWithText (opts, elementToAppendChild, classes) {
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
	if (opts.overlay.color) {
		backgroundColor = getRGBAFromHex(opts.overlay.color)
	} else if (opts.overlay.background) {
		backgroundColor = opts.overlay.background
	} else {
		backgroundColor = getColorFromString(opts.childAppName)
	}
	div.style.background = backgroundColor

	const childDiv = div.appendChild(document.createElement('div'))
	childDiv.style.display = 'flex'
	childDiv.style.flexDirection = elementToAppendChild.clientHeight > 80 ? 'column' : 'row';
	childDiv.style.alignItems = 'center'
	childDiv.style.justifyContent = 'center'
	childDiv.style.color = opts.overlay.color || opts.overlay.textColor || getColorFromString(opts.childAppName, 1)
	childDiv.style.fontWeight = 'bold'
	childDiv.style.height = '100%'
	childDiv.style.fontSize = '32px'
	const appNameDiv = document.createElement('div');
	appNameDiv.appendChild(document.createTextNode(opts.childAppName));
	childDiv.appendChild(appNameDiv);

	SystemJS
		.import('sentry-error-logging!sofe')
		.then(sentry => {
			if (typeof sentry.serviceNameToSquad === 'function') {
				const squadDiv = document.createElement('div');
				squadDiv.appendChild(document.createTextNode(`(${sentry.serviceNameToSquad(opts.childAppName)} squad)`));
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
