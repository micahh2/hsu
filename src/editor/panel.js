export const Panel = {
  initialize({ panel, areasCanvas, charactersCanvas }) {
    const tabs = panel.querySelector('.tabs');
    const areaPane = panel.querySelector('#area-pane');
    const areaTab = tabs.querySelector('#area-tab');
    const characterPane = panel.querySelector('#character-pane');
    const characterTab = tabs.querySelector('#character-tab');

    function selectAreas() {
      Panel.hidePane({ pane: characterPane, canvas: charactersCanvas });
      Panel.showPane({ pane: areaPane, canvas: areasCanvas });
    }
    areaTab.addEventListener('change', selectAreas);

    function selectCharacters() {
      Panel.hidePane({ pane: areaPane, canvas: areasCanvas });
      Panel.showPane({ pane: characterPane, canvas: charactersCanvas });
    }
    characterTab.addEventListener('change', selectCharacters);

    if (areaTab.checked) {
      selectAreas();
    } else {
      selectCharacters();
    }

    return { };
  },
  showPane({ pane, canvas }) {
    pane.style.display = 'block'; // eslint-disable-line no-param-reassign
    canvas.style.visibility = 'visible'; // eslint-disable-line no-param-reassign
  },
  hidePane({ pane, canvas }) {
    pane.style.display = 'none'; // eslint-disable-line no-param-reassign
    canvas.style.visibility = 'hidden'; // eslint-disable-line no-param-reassign
  },
};
