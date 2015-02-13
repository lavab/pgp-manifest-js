"use strict";

let argv = require('yargs').argv;
let fs = require('mz/fs');
let crypto = require('mz/crypto');
let cryptoRaw = require('crypto');
let openpgp = require('openpgp');
let path = require('path');
let pgpManifest = require('../src/index.js');
let mime = require('mime');
let co = require('co');
let util = require('util');

let keyPath         = argv["public-key"];
let fromAddr        = argv.from && argv.from || "sender@example.org";
let toAddr          = argv.to && argv.to || "recipient@example.org";
let ccAddr          = argv.cc;
let subject         = argv.subject && argv.subject || "Very secret email";
let bodyPath        = argv.body;
let attachmentParts = argv.attachments;

let charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz";
function randomString(length) {
	let buffer = cryptoRaw.randomBytes(length);
	let result = "";
	let clength = charset.length - 1;

	for (let i = 0; i < length; i++) {
		result += charset[Math.floor(buffer.readUInt8(i)/255*clength+0.5)]
	}

	return result
}

co(function* () {
	// Read the key
	let armoredKey = yield fs.readFile(keyPath, "utf8");
	let publicKey = openpgp.key.readArmored(armoredKey);

	// Prepare a new manifest
	let manifest = {
		"version": "1.0.0",
		"from":    fromAddr,
		"to":      toAddr,
		"subject": subject,
		"parts":   []
	};
	if (ccAddr) {
		manifest.cc = ccAddr;
	}

	// Read the body and encrypt it
	let rawBody = yield fs.readFile(bodyPath, "utf8");
	let body = yield openpgp.encryptMessage(publicKey.keys, rawBody);

	// Generate a hash of the body
	let hash = crypto.createHash('sha256');
	hash.update(rawBody);

	// Push the body into the manifest
	manifest.parts.push({
		"id": "body",
		"hash": hash.digest("hex"),
		"content-type": mime.lookup(path.extname(bodyPath))
	});

	// Encrypt attachments
	let attachments = [];

	if (attachmentParts) {
		let parts = attachmentParts.split(",");
		for (let part in parts) {
			// Read the file and encrypt it
			let file = yield fs.readFile(part, "utf8");
			let ciphertext = yield openpgp.encryptMessage(publicKey.keys, file);

			// Generate a new, random ID
			let id = randomString(16);

			// Push it into the attachments slice
			attachments.push({
				"id":   id,
				"body": ciphertext,
			});

			// Calculate the checksum
			let hash = crypto.createHash('sha256');
			hash.update(rawBody);

			manifest.parts.push({
				"id":           id,
				"hash":         hash.digest("hex"),
				"filename":     path.basename(part),
				"content-type": mime.lookup(path.extname(part))
			});
		}
	}

	// Generate the manifest and encrypt it
	let rawManifest = pgpManifest.write(manifest);
	let encryptedManifest = yield openpgp.encryptMessage(publicKey.keys, rawManifest);

	// Generate email ID and boundaries
	let id        = randomString(16);
	let boundary1 = randomString(16);
	let boundary2 = randomString(16);

	// Return the email
	console.log(`From: ` + fromAddr + `
To: ` + toAddr + `
`);
	if (ccAddr) {
		console.log("Cc: " + ccAddr);
	}

console.log(`Subject: Encrypted message (` + id + `)
Content-Type: multipart/mixed; boundary="` + boundary1 + `"

--` + boundary1 + `
Content-Type: multipart/alternative; boundary="` + boundary2 + `"

--` + boundary2 + `
Content-Type: application/pgp-encrypted

` + body + `
--` + boundary2 + `
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body>
<p>This is an encrypted email, <a href="http://example.org/#id">
open it here if you email client doesn't support PGP manifests
</a></p>
</body>
</html>
--` + boundary2 + `
Content-Type: text/plain; charset="UTF-8"

This is an encrypted email, open it here if your email client
doesn't support PGP manifests:
http://example.org/#id
--` + boundary2 + `--
`);

	for (let attachment of attachments) {
		console.log(`--` + boundary1 + `
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="` + attachment.id `.pgp"

` + attachment.body + `
`);
	}

	console.log(`--` + boundary1 + `
Content-Type: application/x-pgp-manifest+json
Content-Disposition: attachment; filename="manifest.pgp"

` + encryptedManifest + `
--` + boundary1 + `--
`);
}).catch(function(err) {
	console.log(util.inspect(err));
})