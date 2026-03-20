export async function loadGoogleFonts(fonts: string[]) {
  if (!fonts || fonts.length === 0) return;

  // 1. Filter out fonts already loaded in the document to avoid duplicates
  const fontsToLoad = fonts.filter(font =>
    !document.fonts.check(`12px "${font}"`)
  );

  if (fontsToLoad.length === 0) return; // All fonts are already loaded

  console.log(`Downloading fonts: ${fontsToLoad.join(', ')}`);

  // 2. Build the Google Fonts URL
  // Format: family=Font1:wght@400;700&family=Font2&display=swap
  const fontQuery = fontsToLoad
    .map(font => `family=${font.replace(/ /g, '+')}:wght@100..900`) // Request all weights
    .join('&');

  const url = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;

  // 3. Dynamically create the link tag and wait for the CSS to be downloaded
  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    link.onload = () => resolve();
    link.onerror = () => resolve(); // Continue even on error (better than hanging indefinitely)
    document.head.appendChild(link);
  });

  // 4. WAIT FOR FONTS TO BE READY (The critical part for Fabric.js)
  // Now that the CSS is parsed, document.fonts.load() can find the fonts
  const promises = fontsToLoad.map(font => document.fonts.load(`1em "${font}"`));

  await Promise.all(promises);
  console.log('Fonts ready to render');
}
