/**
 * Script que se ejecuta antes de la hidratación para evitar flash de tema incorrecto
 */
export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        var savedTheme = localStorage.getItem('zona-gol-theme');
        var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        var theme = savedTheme || systemTheme;
        
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        console.warn('Error setting theme:', e);
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />
}