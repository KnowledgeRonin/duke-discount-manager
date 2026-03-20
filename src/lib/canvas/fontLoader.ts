export async function loadGoogleFonts(fonts: string[]) {
  if (!fonts || fonts.length === 0) return;

  // 1. Filtramos las que ya están cargadas en el documento para no repetir
  const fontsToLoad = fonts.filter(font => 
    !document.fonts.check(`12px "${font}"`)
  );

  if (fontsToLoad.length === 0) return; // Ya están todas listas

  console.log(`📥 Descargando fuentes: ${fontsToLoad.join(', ')}`);

  // 2. Construimos la URL de Google Fonts
  // Formato: family=Font1:wght@400;700&family=Font2&display=swap
  const fontQuery = fontsToLoad
    .map(font => `family=${font.replace(/ /g, '+')}:wght@100..900`) // Pedimos todos los pesos
    .join('&');

  const url = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;

  // 3. Creamos el link tag dinámicamente y esperamos que el CSS esté descargado
  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    link.onload = () => resolve();
    link.onerror = () => resolve(); // Continuar aunque falle (mejor que quedarse colgado)
    document.head.appendChild(link);
  });

  // 4. ESPERAR A QUE ESTÉN LISTAS (La parte crítica para Fabric.js)
  // Ahora que el CSS fue parseado, document.fonts.load() puede encontrar las fuentes
  const promises = fontsToLoad.map(font => document.fonts.load(`1em "${font}"`));

  await Promise.all(promises);
  console.log('✅ Fuentes listas para pintar');
}