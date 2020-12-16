export const QuestUI = {
  renderOverlay({
    icon,
    overlay,
    quests,
  }) {
    const questHTML = quests.map((quest) => {
      const { title, tasks } = quest;
      const taskHTML = tasks
        .filter((k) => !k.hidden)
        .map((k) => `<li>${k.description}</li>`)
        .join('');
      return `<input type="button" class="accordion-toggle" value="${title}">
              <div class="accordion-expandable"> <ol>${taskHTML}</ol> </div>`;
    })
      .join('');

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

    const toggles = overlay.querySelectorAll('.accordion-toggle');
    toggles.forEach((toggle) => {
      const sibling = toggle.nextElementSibling;
      QuestUI.hide(sibling);
      toggle.addEventListener('click', () => {
        QuestUI.toggle(sibling);
      });
    });

    icon.addEventListener('click', () => {
      QuestUI.toggle(overlay);
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
