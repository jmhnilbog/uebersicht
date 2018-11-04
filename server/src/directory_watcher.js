/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const paths = require('path');
const fs = require('fs');
const fsevents = require('fsevents');

module.exports = function (directoryPath, callback) {
	const api = {};
	const foundPaths = {};

	const init = function () {
		if (!fs.existsSync(directoryPath)) {
			throw new Error(`could not find ${directoryPath}`);
		}

		const watcher = fsevents(directoryPath);
		watcher.on('change', function (filePath, info) {
			switch (info.event) {
				case 'modified': case 'moved-in': case 'created':
					return findFiles(filePath, info.type, registerFile);
				case 'moved-out': case 'deleted':
					return unregisterFiles(filePath);
			}
		});

		watcher.start();
		console.log('watching', directoryPath);

		findFiles(directoryPath, 'directory', registerFile);

		return watcher;
	};

	var registerFile = function (filePath) {
		filePath = filePath.normalize();
		foundPaths[filePath] = true;
		return callback({
			type: 'added',
			filePath: filePath.normalize(),
			rootPath: directoryPath,
		});
	};

	var unregisterFiles = function (path) {
		path = path.normalize();
		return (() => {
			const result = [];
			for (let filePath of Array.from(Object.keys(foundPaths))) {
				if (filePath.indexOf(path) === 0) {
					result.push(callback({ type: 'removed', filePath, rootPath: directoryPath }));
				}
			}
			return result;
		})();
	};

	// recursively walks the directory tree and calls onFound for every file it
	// finds
	var findFiles = function (path, type, onFound) {
		if (type === 'file') {
			return onFound(path);
		} else {
			return fs.readdir(path, function (err, subPaths) {
				if (err) { return console.log(err); }
				return (() => {
					const result = [];
					for (let subPath of Array.from(subPaths)) {
						const fullPath = paths.join(path, subPath);
						result.push(getPathType(fullPath, (p, t) => findFiles(p, t, onFound)));
					}
					return result;
				})();
			});
		}
	};

	// get type of path as either 'file' or 'directory'
	// callback gets called with (path, type) where path is the path passed in,
	// for convenience
	var getPathType = (path, callback) =>
		fs.stat(path, function (err, stat) {
			if (err) { return console.log(err); }
			const type = stat.isDirectory() ? 'directory' : 'file';
			return callback(path, type);
		})
		;

	return init();
};
