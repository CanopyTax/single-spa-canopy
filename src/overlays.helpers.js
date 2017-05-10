export function setupListener () {
	if (!window._overlayListenerDefined) {
		addOverlayEventListener()
	}
}

export function shouldShowOverlay (div) {
	// check local storage for dev-overlay
	const overlayStorage = localStorage.getItem('cp:single-spa:overlay')
	const sofeInspector = localStorage.getItem('sofe-inspector')
	const devOverlay = overlayStorage === 'true' && sofeInspector === 'true'
	if (devOverlay && sofeInspector) {
		div.style.display = 'block'
	} else {
		div.style.display = 'none'
	}
}

export function getColorFromString (string, opacity= 0.1) {
	let result = (parseInt(
		parseInt(string, 36)
			.toExponential()
			.slice(2, -5)
	, 10) & 0XFFFFFF).toString(16).toUpperCase()
	result = result.split('').concat([0,0,0,0,0,0]).slice(0,6).join('')
	const rgba = [`0x${result.slice(0, 2)}`, `0x${result.slice(2, 4)}`, `0x${result.slice(4, 6)}`]
	return `rgba(${parseInt(rgba[0])}, ${parseInt(rgba[1])}, ${parseInt(rgba[2])}, ${opacity})`
}

export function createOverlayWithText (opts, elementToAppendChild) {
	if (!elementToAppendChild) {
		return null
	}
	const div = elementToAppendChild.appendChild(document.createElement('div'))
	div.style.width = opts.overlay.width || '100%'
	div.style.height = opts.overlay.height || '100%'
	div.style.zIndex = opts.overlay.zIndex || 50
	div.style.position = opts.overlay.position || 'absolute'
	div.style.top = opts.overlay.top || 0
	div.style.left = opts.overlay.left || 0
	div.style.pointerEvents = 'none'
	div.style.background = opts.overlay.background || getColorFromString(opts.childAppName)
	shouldShowOverlay(div)

	const childDiv = div.appendChild(document.createElement('div'))
	childDiv.style.display = 'flex'
	childDiv.style.alignItems = 'center'
	childDiv.style.justifyContent = 'center'
	childDiv.style.color = getColorFromString(opts.childAppName, 1)
	childDiv.style.fontWeight = 'bold'
	childDiv.style.height = '100%'
	childDiv.style.fontSize = '32px'
	childDiv.appendChild(document.createTextNode(opts.childAppName))

	return div
}

export function addOverlayEventListener () {
	window.addEventListener('keypress', function (evt) {
		if (evt.code === 'KeyD' && evt.shiftKey && evt.ctrlKey) {
			localStorage.setItem('cp:single-spa:overlay', !JSON.parse(localStorage.getItem('cp:single-spa:overlay')))
			window.dispatchEvent(new CustomEvent('cp:show-overlay-keypress'))
		}
	})
	window._overlayListenerDefined = true
}