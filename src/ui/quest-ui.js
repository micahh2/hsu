export const QuestUI = {
  renderOverlay({
    icon,
    overlay,
    quests,
  }) {
    const questHTML = quests.map((quest) => {
      const { title, tasks } = quest;
      const completed = tasks.every((k) => k.hidden || k.done) ? '\u2705 ' : '';
      const taskHTML = tasks
        .filter((k) => !k.hidden)
        .map((k) => `<li class="${k.done ? 'task-done' : ''}">${k.description}</li>`)
        .join('');
      return `<input type="button" class="accordion-toggle" value="${completed}${title}">
              <div class="accordion-expandable"> <ol>${taskHTML}</ol> </div>`;
    })
      .join('');

    const cont = overlay.querySelector('.accordion-container');
    if (!cont) {
      /* eslint-disable no-param-reassign */
      overlay.innerHTML = `<div class="container">
                   <div class="overlay"></div>
                   <div class="accordion-container">
                          <h2>Quests</h2>
                          ${questHTML}
                   </div>
            </div>`;
      /* eslint-enable no-param-reassign */
      QuestUI.hide(overlay); // explicitly hide so it can be toggled

      const background = overlay.querySelector('.overlay');
      QuestUI.show(background);
      background.addEventListener('click', () => {
        QuestUI.hide(overlay);
      });

      icon.addEventListener('click', () => {
        QuestUI.toggle(overlay);
      });
    } else {
      cont.innerHTML = `
          <h2>Quests</h2>
          ${questHTML}
      `;
    }
    const toggles = overlay.querySelectorAll('.accordion-toggle');
    toggles.forEach((toggle) => {
      const sibling = toggle.nextElementSibling;
      QuestUI.hide(sibling);
      toggle.addEventListener('click', () => {
        QuestUI.toggle(sibling);
      });
    });
  },
  show(element) {
    element.style.display = 'block'; // eslint-disable-line no-param-reassign
  },
  hide(element) {
    element.style.display = 'none'; // eslint-disable-line no-param-reassign
  },
  toggle(element) {
    if (element.style.display === 'none') {
      QuestUI.show(element);
    } else {
      QuestUI.hide(element);
    }
  },
};
