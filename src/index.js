"use strict";

var semver = require("semver");

exports.valid = function(manifest) {
	// Check if version is here
	if (!semver.valid(manifest.version)) {
		console.log("#1");
		return false;
	} 

	// Check parts contents
	if (!manifest.parts || manifest.parts.length === 0) {
		console.log("#2");
		return false;
	}

	// Check if body is there and verify part contents
	let foundBody;

	for (let part of manifest.parts) {
		if (!part.id || !part.hash || !part["content-type"]) {
			return false;
		}

		if (part.id === "body") {
			foundBody = true;
		}
	}

	if (!foundBody) {
		return false;
	}

	return true;
}

exports.parse = function(input) {
	// Parse the manifest
	let manifest = JSON.parse(input);

	// Validate the manifest
	if (!exports.valid(manifest)) {
		return false;
	}

	return manifest;
}

exports.write = function(manifest) {
	// Validate the manifest
	if (!exports.valid(manifest)) {
		return false;
	}

	// Stringify it
	return JSON.stringify(manifest);
}