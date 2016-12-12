import {unloadChildApplication} from 'single-spa';

export function initializeHotReloading(opts, url, waitForUnmount) {
	const baseUrl = url.slice(0, url.lastIndexOf('/'));
	const evtSource = new EventSource(`${baseUrl}/hot-reload`);

	SystemJS
	.import('systemjs-hmr')
	.then(() => {
		evtSource.onmessage = function(e) {
			unloadChildApplication(opts.childAppName, {waitForUnmount})
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
	});
}
