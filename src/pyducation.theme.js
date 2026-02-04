// -------------------------------------------------------------
// Theme switching
// -------------------------------------------------------------
function initTheme(){
    const themeButtons = document.querySelectorAll('.theme-btn');
    if (!themeButtons.length) return;
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'default';
    themeButtons.forEach(btn => btn.classList.remove('active'));

    if (savedTheme !== 'default') {
        body.setAttribute('data-theme', savedTheme);
        const savedBtn = document.querySelector(`[data-theme="${savedTheme}"]`);
        if (savedBtn) savedBtn.classList.add('active');
        const defaultBtn = document.querySelector('[data-theme="default"]');
        if (defaultBtn) defaultBtn.classList.remove('active');
    } else {
        body.removeAttribute('data-theme');
        const defaultBtn = document.querySelector('[data-theme="default"]');
        if (defaultBtn) defaultBtn.classList.add('active');
    }

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');

            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (theme === 'default') {
                body.removeAttribute('data-theme');
            } else {
                body.setAttribute('data-theme', theme);
            }

            localStorage.setItem('theme', theme || 'default');
        });
    });
}

