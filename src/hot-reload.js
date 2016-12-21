export function initializeHotReloading(opts, url, waitForUnmount) {
	const baseUrl = url.slice(0, url.lastIndexOf('/'));
	const evtSource = new EventSource(`${baseUrl}/hot-reload`);

	Promise
	.all([SystemJS.import('systemjs-hmr'), SystemJS.import('single-spa')])
	.then(values => {
		const hmr = values[0];
		if (hmr && hmr.setDebugLogging) {
			hmr.setDebugLogging(false);
		}

		const singleSpa = values[1];

		evtSource.onmessage = function(e) {
			singleSpa
			.unloadChildApplication(opts.childAppName, {waitForUnmount})
			.then(() => {
				// When we unload the application, a new evtSource will be subscribed to.
				evtSource.close();
			})
			.catch(err => {
				console.error(`Failed to unload app '${opts.childAppName}'`);
				console.error(err);
			});
		}

		evtSource.onerror = function(e) {
			console.error(`Error hot loading app '${opts.childAppName}'.`);
			console.error(e);
		}
	})
	.catch(err => {
		console.error(`Failed to set up hot reloading for app '${opts.childAppName}'`);
		console.error(err);
	})
}
