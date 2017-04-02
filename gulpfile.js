const gulp = require('gulp');
const clean = require('gulp-clean');
const clone = require('gulp-clone');
const concat = require('gulp-concat');
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
    var placebotStream = gulp.src([
        './src/placebot.js',
        './src/settings.js',
        './src/draw.js'
    ]).pipe(concat('placebot.js'));
    
    var importStream = gulp.src('./import.js');
    var footerStream = gulp.src('./import_footer.js');
    var bookmarkletStream = gulp.src('./import_bm.js');
    var userscriptStream = gulp.src('./import_us.js');
    
    var placebotUgly = placebotStream.pipe(clone()).pipe(uglify());
    
    return merge(
            merge(
                    bookmarkletStream.pipe(clone()),
                    importStream.pipe(clone()),
                    footerStream.pipe(clone())
                )
                .pipe(concat('bookmarklet.js'))
            ,
            merge(
                    userscriptStream.pipe(clone()),
                    importStream.pipe(clone()),
                    footerStream.pipe(clone())
                )
                .pipe(concat('placebot.user.js'))
            ,
            merge(
                    userscriptStream.pipe(clone())
                        .pipe(replace(/(\/\/ \@name[^\n]+)/, '$1-full')),
                    placebotUgly.pipe(clone()),
                    footerStream.pipe(clone())
                )
                .pipe(concat('placebot-full.user.js'))
            ,
            placebotUgly.pipe(clone())
                .pipe(rename({ suffix: '.min' }))
            ,
            placebotStream.pipe(clone())
        )
        .pipe(replace('$$version', pkg.version))
        .pipe(replace('$$description', pkg.description))
        .pipe(gulp.dest('./dist'));
});
