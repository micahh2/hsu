// use the the keyword "export", to export a "const" object called StartPageUI
export const StartPageUI = {
    renderStartButton(start, resolve) {
        const loading = start.querySelector('.start-page-container .loading');
        loading.innerHTML = '';
        const button = document.createElement('input');
        button.type = 'button';
        button.value = 'Start Game';
        button.addEventListener('click', () => {
            start.style.display = 'none';
            resolve();
        });
        loading.appendChild(button);
    },
};
