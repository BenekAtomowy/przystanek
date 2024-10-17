import gulp from 'gulp';
import fileInclude from 'gulp-file-include';
import htmlmin from 'gulp-htmlmin';
import cleanCSS from 'gulp-clean-css';
import uglify from 'gulp-uglify';
import browserSync from 'browser-sync';
import fs from 'fs';
import path from 'path';

// Tworzymy instancję browser-sync
const sync = browserSync.create();

// Funkcja do wczytywania danych JSON i przetwarzania HTML
function processJson() {
  // Sprawdzamy, czy plik JSON istnieje
  const jsonFilePath = './src/data/index.json';
  
  let data = {};

  if (fs.existsSync(jsonFilePath)) {
    // Jeśli plik istnieje, wczytujemy dane z JSON
    data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  } else {
    // Jeśli pliku nie ma, informujemy o tym i uruchamiamy bez danych
    console.log('Plik index.json nie istnieje, serwer uruchomiony bez przetwarzania danych.');
  }

  // Przetwarzanie szablonów HTML
  return gulp.src('./src/templates/*.html') // Szablon HTML
    .pipe(fileInclude({
      prefix: '{{',
      suffix: '}}',
      basepath: '@file',
      context: data // Wstawiamy dane JSON do kontekstu (lub pusty obiekt)
    }))
    .pipe(gulp.dest('./dist')) // Zapisujemy plik wynikowy do folderu dist
    .pipe(sync.stream());
}

// Zadanie do kopiowania folderu admin do folderu dist
gulp.task('copy-admin', () => {
  return gulp.src('./admin/**/*') // Kopiujemy wszystkie pliki z folderu admin
    .pipe(gulp.dest('./dist/admin'))  // Umieszczamy je w folderze dist/admin
    .pipe(sync.stream());             // Aktualizujemy browser-sync
});

// Zadanie do kopiowania folderu admin do folderu dist
gulp.task('copy-styles', () => {
  return gulp.src('./src/styles/**/*') // Kopiujemy wszystkie pliki z folderu admin
    .pipe(gulp.dest('./dist/styles/'))  // Umieszczamy je w folderze dist/admin
    .pipe(sync.stream());             // Aktualizujemy browser-sync
});

gulp.task('copy-fonts', () => {
  return gulp.src('./src/webfonts/**/*') // Kopiujemy wszystkie pliki z folderu admin
    .pipe(gulp.dest('./dist/webfonts/'))  // Umieszczamy je w folderze dist/admin
    // .pipe(sync.stream());             // Aktualizujemy browser-sync
});

// Funkcja kopiowania plików
function copyImages(done) {
  const sourceDir = './src/styles/images';
  const destDir = './dist/styles/images';

  copyFiles(sourceDir, destDir)
  copyFiles("./images", "./dist/images" )
  done();
}

// Rejestrujemy zadanie Gulp do kopiowania obrazów
gulp.task('copy-media', copyImages);

// Zadanie do parsowania HTML
gulp.task('html', () => {
  return processJson(); // Wywołanie funkcji do przetwarzania JSON i generowania HTML
});

// Minifikacja CSS
gulp.task('css', () => {
  return gulp.src('./src/styles/*.css')
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(gulp.dest('./dist/styles'))
    .pipe(sync.stream());
});

// Minifikacja JS
gulp.task('js', () => {
  return gulp.src('./src/scripts/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./dist/scripts'))
    .pipe(sync.stream());
});

// Serwer lokalny z browser-sync
gulp.task('serve', () => {
  sync.init({
    server: './dist'
  });

  gulp.watch('./src/templates/*.html', gulp.series('html'));
  gulp.watch('./src/styles/*.css', gulp.series('css'));
  gulp.watch('./src/scripts/*.js', gulp.series('js'));
  gulp.watch('./src/data/*.json', gulp.series('html')); // Obserwujemy zmiany w JSON
  gulp.watch('./src/admin/**/*', gulp.series('copy-admin')); // Obserwujemy zmiany w folderze admin
  gulp.watch('./src/styles/**/*', gulp.series('copy-styles')); 
  gulp.watch('./src/webfonts/**/*', gulp.series('copy-fonts')); 
  gulp.watch('./images/**/*', gulp.series('copy-media')); 
  
});

// Domyślne zadanie Gulp
gulp.task('default', gulp.series('html', 'css', 'js', 'copy-admin', 'copy-styles','copy-fonts','copy-media', 'serve'));

gulp.task('prod', gulp.series('html', 'css', 'js', 'copy-admin', 'copy-styles','copy-fonts','copy-media'))

function copyFiles( sourceDir, destDir){
  // Sprawdzamy, czy folder dest istnieje, jeśli nie, tworzymy go
  if (!fs.existsSync(destDir)){
   fs.mkdirSync(destDir, { recursive: true });
 }

 // Pobieramy listę plików i katalogów w folderze źródłowym
 fs.readdirSync(sourceDir).forEach(file => {
   const sourceFile = path.join(sourceDir, file);
   const destFile = path.join(destDir, file);

   // Sprawdzamy, czy to plik, czy katalog
   const stats = fs.lstatSync(sourceFile);

   if (stats.isFile()) {
     // Kopiowanie pliku
     fs.copyFileSync(sourceFile, destFile);
   } else if (stats.isDirectory()) {
     // Rekurencyjne kopiowanie katalogu
     copyDirectory(sourceFile, destFile);
   }
 });
}


// Funkcja do rekurencyjnego kopiowania katalogów
function copyDirectory(sourceDir, destDir) {
  if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.readdirSync(sourceDir).forEach(file => {
    const sourceFile = path.join(sourceDir, file);
    const destFile = path.join(destDir, file);

    const stats = fs.lstatSync(sourceFile);

    if (stats.isFile()) {
      fs.copyFileSync(sourceFile, destFile);
    } else if (stats.isDirectory()) {
      copyDirectory(sourceFile, destFile);
    }
  });
}