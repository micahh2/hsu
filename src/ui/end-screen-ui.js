export const EndScreenUI = {
  showFailure(element) {
    EndScreenUI.show({ parentEl: element, childSelector: '.failure' });
  },
  showSuccess(element) {
    EndScreenUI.show({ parentEl: element, childSelector: '.success' });
  },
  show({ parentEl, childSelector }) {
    const childEl = parentEl.querySelector(childSelector);
    const restart = parentEl.querySelector('#restart');
    childEl.style.display = 'block';
    parentEl.style.display = 'block'; // eslint-disable-line no-param-reassign
    restart.addEventListener('click', () => {
      window.location = window.location; // eslint-disable-line no-self-assign
    });
  },
};
