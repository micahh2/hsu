export const QuestUI = {
  renderOverlay({
    icon,
    overlay,
    quests,
  }) {
  	const questHTMquest.L = quests.map((quest) => {
  		const { title, tasks } = quest;  // TODO try to understand
  		const taskHTML = tasks
  			.filter((k) => !k.hidden)
  			.map((k) => `<li>${k.description}</li>`)
  			.join('');
  		return `
  			<input type="button" class="accordion-toggle" value="${title}">
  			<div class="accordion-expandable">
  				<ol>${taskHTML}</ol>
  			</div>
  		`;
  	}).join('');

    overlay.innerHTML = ` <div class="container">
  		 <div class="overlay"></div>
		 <div class="accordion-container">
			<h2>Quests</h2>
			${questHTML}
		 </div>
	  </div>`;
    QuestUI.hide(overlay); // explicitly hide so it can be toggled

    const background = overlay.querySelector('.overlay');
    QuestUI.show(background);
    background.addEventListener('click', () => { QuestUI.hide(overlay); });

    const toggles = overlay.querySelectorAll('.accordion-toggle');
    toggles.forEach((toggle) => {
      const sibling = toggle.nextElementSibling;
      QuestUI.hide(sibling);
      toggle.addEventListener('click', () => { QuestUI.toggle(sibling); });
    });

    icon.addEventListener('click', () => { QuestUI.toggle(overlay); });
  },
  show(element) {
  	element.style.display = 'block';
  },
  hide(element) {
  	element.style.display = 'none';
  },
  toggle(element) {
  	if (element.style.display === 'none') {
  		QuestUI.show(element);
  	} else {
  		QuestUI.hide(element);
  	}
  },
};
