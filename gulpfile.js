var gulp   = require("gulp");
var to5    = require("gulp-6to5");
var jshint = require("gulp-jshint");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var uglify = require("gulp-uglify");
var sourcemaps = require("gulp-sourcemaps");

var getBundleName = function() {
	return require("./package.json").name;
};

gulp.task("minified", function() {
	var bundler = browserify({
		entries: ["./src/index.js"],
		debug: true
	});

	return bundler
		.bundle()
		.pipe(source(getBundleName() + '.min.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(to5())
		.pipe(uglify())
		.pipe(sourcemaps.write("./"))
		.pipe(gulp.dest("./lib"));
});

gulp.task("basic", function() {
	var bundler = browserify({
		entries: ["./src/index.js"],
		debug: true
	});

	return bundler
		.bundle()
		.pipe(source(getBundleName() + '.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(to5())
		.pipe(sourcemaps.write("./"))
		.pipe(gulp.dest("./lib"));
});

gulp.task("build", ["minified", "basic"], function() {
	return gulp.src([
			"./src/generate.js",
			"./src/parse.js"
		])
		.pipe(to5())
		.pipe(gulp.dest("./bin"));
});

gulp.task("default", ["build"]);