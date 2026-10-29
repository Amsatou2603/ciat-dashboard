// Applique le thème avant le premier rendu pour éviter tout flash (préférence d'affichage, non sensible).
// Fichier externe (et non script inline) afin de respecter une CSP stricte : script-src 'self'.
try {
  var t = localStorage.getItem('ciat-theme') || 'system'
  var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
} catch (e) { document.documentElement.dataset.theme = 'light' }
