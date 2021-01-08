export const InventoryUI = {
  renderOverlay({ icon, overlay, items }) {
    const itemHTML = items
      .filter((item) => item.inInventory)
      .map((item, index) => {
        const size = 4; // Sprite width & height
        const posx = (item.spriteIndex % size) * 100;
        const posy = Math.floor(item.spriteIndex / size) * 100;
        const css = `
        background-position: ${posx}% ${posy}%;
        background-size: ${size}00%;
      `;
        return `<div id="${index}" class="slot">
        <div class="item" style="${css}"></div>
      </div>`;
      }).join('');

    /* eslint-disable no-param-reassign */
    const cont = overlay.querySelector('.accordion-container');
    if (!cont) {
      overlay.innerHTML = `<div class="container">
                   <div class="overlay"></div>
                   <div class="accordion-container">
                          <h2>Inventory</h2>
                          ${itemHTML}
                   </div>
            </div>`;
      InventoryUI.hide(overlay); // explicitly hide so it can be toggled

      const background = overlay.querySelector('.overlay');
      InventoryUI.show(background);
      background.addEventListener('click', () => {
        InventoryUI.hide(overlay);
      });

      icon.addEventListener('click', () => {
        InventoryUI.toggle(overlay);
      });
    } else {
      cont.innerHTML = `
        <h2>Inventory</h2>
        ${itemHTML}
      `;
    }
    /* eslint-enable no-param-reassign */
  },
  show(element) {
    element.style.display = 'block'; // eslint-disable-line no-param-reassign
  },
  hide(element) {
    element.style.display = 'none'; // eslint-disable-line no-param-reassign
  },
  toggle(element) {
    if (element.style.display === 'none') {
      InventoryUI.show(element);
    } else {
      InventoryUI.hide(element);
    }
  },
};
