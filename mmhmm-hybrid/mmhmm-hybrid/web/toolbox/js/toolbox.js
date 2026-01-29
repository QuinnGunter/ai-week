const creatorButton = document.getElementById('creator');
const cameraButton = document.getElementById('camera');
const floatingNavButton = document.getElementById('floating-nav');

init()

function onThemeChanged(theme) {
    const isLight = theme == "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}

function init() {
    creatorButton.addEventListener('click', function() {
        changeAppMode("Full");
    });

    cameraButton.addEventListener('click', function() {
        changeAppMode("Mini");
    });

    floatingNavButton.addEventListener('click', function() {
        launchFloatingNav();
    });

    const params = new URLSearchParams(window.location.search)
    var theme = params.get('theme');
    if (!theme) {
        theme = 'light';
    }
    onThemeChanged(theme);
};
