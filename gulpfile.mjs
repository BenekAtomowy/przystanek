import gulp from 'gulp';
import browserSync from 'browser-sync';
import fs from 'fs';
import path from 'path';
import through2 from 'through2';
import cleanCSS from 'gulp-clean-css';
import uglify from 'gulp-uglify';

// Tworzymy instancję browser-sync
const sync = browserSync.create();

// Funkcja do wczytywania danych JSON i przetwarzania HTML
function processPages() {
  // Ścieżka do pliku layoutu
  const layoutPath = './src/templates/layouts/layout.html';
  // Ścieżka do folderu komponentów
  const componentsPath = './src/templates/components/';

  // Wczytaj zawartość layoutu
  const layoutHtml = fs.readFileSync(layoutPath, 'utf8');

  // Przetwarzanie każdego pliku z folderu pages
  return gulp.src('./src/templates/pages/*.html')
    .pipe(through2.obj(function (file, _, cb) {
      if (file.isBuffer()) {
        // Wczytaj zawartość bieżącego pliku podstrony
        const pageContent = file.contents.toString();

        // Pobierz nazwę pliku bez rozszerzenia (np. "index" lub "contact")
        const pageName = path.basename(file.path, '.html');
        // Ścieżka do odpowiedniego pliku JSON
        const jsonFilePath = `./src/data/${pageName}.json`;

        // Wczytaj dane z pliku JSON, jeśli istnieje
        let data = {};
        if (fs.existsSync(jsonFilePath)) {
          data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        } else {
          console.log(`Plik ${pageName}.json nie istnieje, używane będą tylko dane z szablonu.`);
        }

        // Zamień {{content}} w layout.html na rzeczywistą zawartość podstrony
        let resultHtml = layoutHtml.replace('{{content}}', pageContent);
        // Podmień wszystkie inne znaczniki {{key}} na wartości z JSON
        resultHtml = resultHtml.replace(/{{\s*([^}]+)\s*}}/g, function(match, p1) {
          return data[p1] || '';
        });

        // Obsługa komponentów: zamiana znaczników na zawartość plików komponentów
        resultHtml = resultHtml.replace(/<component name="([^"]+)"><\/component>/g, function(match, componentName) {
          const componentFilePath = path.join(componentsPath, `${componentName}.html`);
          if (fs.existsSync(componentFilePath)) {
            return fs.readFileSync(componentFilePath, 'utf8');
          } else {
            console.log(`Komponent ${componentName}.html nie istnieje.`);
            return ''; // Jeśli komponent nie istnieje, zwróć pusty ciąg
          }
        });

        // Zapisz wynik do bufora pliku
        file.contents = Buffer.from(resultHtml);
        // Zaktualizuj nazwę pliku, aby odpowiadała oryginalnej stronie
        file.path = path.join(file.base, path.basename(file.path));
      }
      cb(null, file);
    }))
    .pipe(gulp.dest('./dist')) // Zapisz wynikowy plik w folderze dist
    .pipe(sync.stream());
}

// Zadanie do kopiowania folderu admin do folderu dist
gulp.task('copy-admin', () => {
  return gulp.src('./admin/**/*')
    .pipe(gulp.dest('./dist/admin'))
    .pipe(sync.stream());
});

// Zadanie do kopiowania stylów
gulp.task('copy-styles', () => {
  return gulp.src('./src/styles/**/*')
    .pipe(gulp.dest('./dist/styles/'))
    .pipe(sync.stream());
});

// Zadanie do kopiowania czcionek
gulp.task('copy-fonts', () => {
  return gulp.src('./src/webfonts/**/*')
    .pipe(gulp.dest('./dist/webfonts/'));
});

// Funkcja kopiowania plików
function copyImages(done) {
  const sourceDir = './src/styles/images';
  const destDir = './dist/styles/images';

  copyFiles(sourceDir, destDir);
  copyFiles("./images", "./dist/images");
  copyFiles("./src/webfonts", "./dist/webfonts");
  done();
}

// Rejestrujemy zadanie Gulp do kopiowania obrazów
gulp.task('copy-media', copyImages);

// Zadanie do parsowania HTML
gulp.task('html', () => {
  return processPages();
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

  gulp.watch('./src/templates/**/*.html', gulp.series('html'));
  gulp.watch('./src/styles/*.css', gulp.series('css'));
  gulp.watch('./src/scripts/*.js', gulp.series('js'));
  gulp.watch('./src/data/*.json', gulp.series('html'));
  gulp.watch('./admin/**/*', gulp.series('copy-admin'));
  gulp.watch('./src/styles/**/*', gulp.series('copy-styles'));
  gulp.watch('./src/webfonts/**/*', gulp.series('copy-fonts'));
  gulp.watch('./images/**/*', gulp.series('copy-media'));
});

// Domyślne zadanie Gulp
gulp.task('default', gulp.series('html', 'css', 'js', 'copy-admin', 'copy-styles', 'copy-fonts', 'copy-media', 'serve'));

// Zadanie produkcyjne
gulp.task('prod', gulp.series('html', 'css', 'js', 'copy-admin', 'copy-styles', 'copy-fonts', 'copy-media'));

// Funkcja kopiowania plików
function copyFiles(sourceDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.readdirSync(sourceDir).forEach(file => {
    const sourceFile = path.join(sourceDir, file);
    const destFile = path.join(destDir, file);

    const stats = fs.lstatSync(sourceFile);

    if (stats.isFile()) {
      fs.copyFileSync(sourceFile, destFile);
    } else if (stats.isDirectory()) {
      copyDirectory(sourceFile, destDir);
    }
  });
}

// Funkcja do rekurencyjnego kopiowania katalogów
function copyDirectory(sourceDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.readdirSync(sourceDir).forEach(file => {
    const sourceFile = path.join(sourceDir, file);
    const destFile = path.join(destDir, file);

    const stats = fs.lstatSync(sourceFile);

    if (stats.isFile()) {
      fs.copyFileSync(sourceFile, destFile);
    } else if (stats.isDirectory()) {
      copyDirectory(sourceFile, destDir);
    }
  });
}
