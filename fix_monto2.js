const fs = require('fs');
let html = fs.readFileSync('src/app/admin/conversion/conversion.html', 'utf8');

// Reemplazar para actual - usar placeholder primero
html = html.replace(
  "[value]=\"item.actual\"\n                            step=\"0.01\"\n                            min=\"0\"\n                            (focus)='$event.target.select()'\n                            (blur)=\"actualizarMontoComparacion(item.index, 'actual', $event.target.value)\"",
  "[(ngModel)]=\"item.actual\"\n                            step=\"0.01\"\n                            min=\"0\""
);

fs.writeFileSync('src/app/admin/conversion/conversion.html', html);
console.log('Done');