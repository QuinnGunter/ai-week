const params = new URLSearchParams(window.location.search)
var theme = params.get('theme');
if(!theme) {
    theme = 'light';
}
onThemeChanged(theme);

function onClose() {
    window.close();
}

function onDownloadPlugin() {
    window.open('https://marketplace.elgato.com/product/mmhmm-61274056-f6e5-4a06-82b4-5dc535aa0cfc');
    window.close();
}

function onLearnMore() {
    window.open('https://help.mmhmm.app/hc/en-us/articles/18891538024727-Use-Elgato-s-Stream-Deck-with-mmhmm');
    window.close();
}

function askAgainCheckboxClicked(checkbox) {
    streamDeckPromptAskChanged(!checkbox.checked);
}

function onThemeChanged(theme) {
    const isLight = theme == "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}