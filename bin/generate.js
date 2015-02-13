"use strict";

var _taggedTemplateLiteral = function (strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); };

var argv = require("yargs").argv;
var fs = require("mz/fs");
var crypto = require("mz/crypto");
var cryptoRaw = require("crypto");
var openpgp = require("openpgp");
var path = require("path");
var pgpManifest = require("../src/index.js");
var mime = require("mime");
var co = require("co");
var util = require("util");

var keyPath = argv["public-key"];
var fromAddr = argv.from && argv.from || "sender@example.org";
var toAddr = argv.to && argv.to || "recipient@example.org";
var ccAddr = argv.cc;
var subject = argv.subject && argv.subject || "Very secret email";
var bodyPath = argv.body;
var attachmentParts = argv.attachments;

var charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz";
function randomString(length) {
	var buffer = cryptoRaw.randomBytes(length);
	var result = "";
	var clength = charset.length - 1;

	for (var i = 0; i < length; i++) {
		result += charset[Math.floor(buffer.readUInt8(i) / 255 * clength + 0.5)];
	}

	return result;
}

co(regeneratorRuntime.mark(function callee$0$0() {
	var armoredKey, publicKey, manifest, rawBody, body, hash, attachments, parts, part, file, ciphertext, _id, _hash, rawManifest, encryptedManifest, id, boundary1, boundary2, _iterator, _step, attachment;
	return regeneratorRuntime.wrap(function callee$0$0$(context$1$0) {
		while (1) switch (context$1$0.prev = context$1$0.next) {
			case 0:
				context$1$0.next = 2;
				return fs.readFile(keyPath, "utf8");
			case 2:
				armoredKey = context$1$0.sent;
				publicKey = openpgp.key.readArmored(armoredKey);
				manifest = {
					version: "1.0.0",
					from: fromAddr,
					to: toAddr,
					subject: subject,
					parts: []
				};
				if (ccAddr) {
					manifest.cc = ccAddr;
				}

				context$1$0.next = 8;
				return fs.readFile(bodyPath, "utf8");
			case 8:
				rawBody = context$1$0.sent;
				context$1$0.next = 11;
				return openpgp.encryptMessage(publicKey.keys, rawBody);
			case 11:
				body = context$1$0.sent;
				hash = crypto.createHash("sha256");
				hash.update(rawBody);

				// Push the body into the manifest
				manifest.parts.push({
					id: "body",
					hash: hash.digest("hex"),
					"content-type": mime.lookup(path.extname(bodyPath))
				});

				attachments = [];
				if (!attachmentParts) {
					context$1$0.next = 34;
					break;
				}
				parts = attachmentParts.split(",");
				context$1$0.t0 = regeneratorRuntime.keys(parts);
			case 19:
				if ((context$1$0.t1 = context$1$0.t0()).done) {
					context$1$0.next = 34;
					break;
				}
				part = context$1$0.t1.value;
				context$1$0.next = 23;
				return fs.readFile(part, "utf8");
			case 23:
				file = context$1$0.sent;
				context$1$0.next = 26;
				return openpgp.encryptMessage(publicKey.keys, file);
			case 26:
				ciphertext = context$1$0.sent;
				_id = randomString(16);


				// Push it into the attachments slice
				attachments.push({
					id: _id,
					body: ciphertext });

				_hash = crypto.createHash("sha256");
				_hash.update(rawBody);

				manifest.parts.push({
					id: _id,
					hash: _hash.digest("hex"),
					filename: path.basename(part),
					"content-type": mime.lookup(path.extname(part))
				});
				context$1$0.next = 19;
				break;
			case 34:
				rawManifest = pgpManifest.write(manifest);
				context$1$0.next = 37;
				return openpgp.encryptMessage(publicKey.keys, rawManifest);
			case 37:
				encryptedManifest = context$1$0.sent;
				id = randomString(16);
				boundary1 = randomString(16);
				boundary2 = randomString(16);


				// Return the email
				console.log("From: " + fromAddr + "\nTo: " + toAddr + "\n");
				if (ccAddr) {
					console.log("Cc: " + ccAddr);
				}

				console.log("Subject: Encrypted message (" + id + ")\nContent-Type: multipart/mixed; boundary=\"" + boundary1 + "\"\n\n--" + boundary1 + "\nContent-Type: multipart/alternative; boundary=\"" + boundary2 + "\"\n\n--" + boundary2 + "\nContent-Type: application/pgp-encrypted\n\n" + body + "\n--" + boundary2 + "\nContent-Type: text/html; charset=\"UTF-8\"\n\n<!DOCTYPE html>\n<html>\n<body>\n<p>This is an encrypted email, <a href=\"http://example.org/#id\">\nopen it here if you email client doesn't support PGP manifests\n</a></p>\n</body>\n</html>\n--" + boundary2 + "\nContent-Type: text/plain; charset=\"UTF-8\"\n\nThis is an encrypted email, open it here if your email client\ndoesn't support PGP manifests:\nhttp://example.org/#id\n--" + boundary2 + "--\n");

				for (_iterator = attachments[Symbol.iterator](); !(_step = _iterator.next()).done;) {
					attachment = _step.value;
					console.log("--" + boundary1 + "\nContent-Type: application/octet-stream\nContent-Disposition: attachment; filename=\"" + attachment.id(_taggedTemplateLiteral([".pgp\"\n\n"], [".pgp\"\r\n\r\n"])) + attachment.body + "\n");
				}

				console.log("--" + boundary1 + "\nContent-Type: application/x-pgp-manifest+json\nContent-Disposition: attachment; filename=\"manifest.pgp\"\n\n" + encryptedManifest + "\n--" + boundary1 + "--\n");
			case 46:
			case "end":
				return context$1$0.stop();
		}
	}, callee$0$0, this);
}))["catch"](function (err) {
	console.log(util.inspect(err));
});
// Read the key


// Prepare a new manifest
// Read the body and encrypt it


// Generate a hash of the body
// Encrypt attachments
// Read the file and encrypt it


// Generate a new, random ID
// Calculate the checksum


// Generate the manifest and encrypt it


// Generate email ID and boundaries