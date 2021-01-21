export const EmailUI = {
  renderOverlay(element) {
    const innerEl = element.querySelector('#message-overlay');
    const background = element.querySelector('.overlay');
    const html = `
    <button class="accHead">Course Schedule</button>
    <div class="accBody">Unavilable.</div>

    <button class="accHead">Reregistration for Next Semester</button>
    <div class="accBody">Gib Money.</div>

    <button class="accHead">Greetings from a Nigerian Prince</button>
    <div class="accBody">Need help, send money and get money.</div>

    <button class="accHead">Maultaschen?</button>
    <div class="accBody">Maultaschen!</div>
  `;
    innerEl.innerHTML = html;

    let isOpen = true;
    background.style.display = 'block';
    innerEl.style.display = 'block';
    background.addEventListener('click', () => {
      if (isOpen) {
        innerEl.style.display = 'none';
        background.style.display = 'none';
      } else {
        innerEl.style.display = 'block';
        background.style.display = 'block';
      }
      isOpen = !isOpen;
    });

    const accHeadList = innerEl.querySelectorAll('.accHead');
    for (let i = 0; i < accHeadList.length; i++) {
      accHeadList[i].addEventListener('click', (e) => {
        e.preventDefault();
        const accBodyList = e.target.nextElementSibling;
        if (accBodyList.style.display === 'block') {
          accBodyList.style.display = 'none';
        } else {
          accBodyList.style.display = 'block';
        }
      });
    }
  },
};
