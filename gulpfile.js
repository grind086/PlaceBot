const fs = require('fs');
const gulp = require('gulp');
const clean = require('gulp-clean');
const merge = require('gulp-merge');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify');

const pkg = require('./package.json');

gulp.task('clean', function() {
    return gulp.src('./dist', { read: false })
        .pipe(clean());
});

gulp.task('default', ['clean'], function() {
    var importScript = fs.readFileSync('./import.js', 'utf8');
    var botScript = fs.readFileSync('./placebot.js', 'utf8');
    
    return merge(
            merge (
                    gulp.src('./import_bm.js')
                        .pipe(rename('bookmarklet.js'))
                    ,
                    gulp.src('./import_us.js')
                        .pipe(rename('placebot.user.js'))
                )
                .pipe(replace('$$import', importScript))
            ,
            gulp.src('./import_us.js')
                .pipe(replace('(function() {\n', ''))
                .pipe(replace('\n})();', ''))
                .pipe(rename('placebot-full.user.js'))
                .pipe(replace('$$import', botScript))
            ,
            gulp.src('./placebot.js')
                .pipe(uglify())
                .pipe(rename({ suffix: '.min' }))
        )
        .pipe(replace('$$version', pkg.version))
        .pipe(replace('$$description', pkg.description))
        .pipe(gulp.dest('./dist'));
});