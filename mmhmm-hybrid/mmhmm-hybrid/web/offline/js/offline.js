const params = new URLSearchParams(window.location.search)
const messageId = parseInt(params.get('id'));
var theme = params.get('theme');
if(!theme) {
    theme = 'light';
}
onThemeChanged(theme);

function navigateHome() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has("home")) {
      const home = urlParams.get('home');
      window.location.href = home;
    }
  }

  function onThemeChanged(theme) {
    const isLight = theme == "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}