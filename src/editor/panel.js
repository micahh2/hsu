const anonFunc = () => {};
export const Panel = {
  initialize({ panel, areasCanvas, charactersCanvas, eventCallback = anonFunc, areas }) {
    const areaPane = panel.querySelector('#area-pane');
    // const characterPane = panel.querySelector('#character-pane');

    function updateAreas(newAreas) {
      console.log('Update areas');
      areas = newAreas; // eslint-disable-line no-param-reassign
    }

    Panel.showPane({ pane: areaPane, canvas: areasCanvas });

    return {
      updateAreas,
    };
  },
  showPane({ pane, canvas }) {
    pane.style.display = 'block'; // eslint-disable-line no-param-reassign
    canvas.style.display = 'block'; // eslint-disable-line no-param-reassign
  },
  hidePane({ pane, canvas }) {
    pane.style.display = 'none'; // eslint-disable-line no-param-reassign
    canvas.style.display = 'none'; // eslint-disable-line no-param-reassign
  },
};
