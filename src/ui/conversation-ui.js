export const ConversationUI = {
  /**
   * renderConversation.
   *
   * @param {Object} conversation
   * @param {Character} conversation.character
   * @param {currentDialog} conversation.currentDialog
   * @example
        renderConversation(gameState.conversation);
 */
  renderConversation(conversation, updateConvo) {
    const el = document.getElementById('conversation');
    if (!conversation) {
      el.style.display = 'none';
      return;
    }
    const {
      character,
      currentDialog,
    } = conversation;
    const { response } = currentDialog;
    const goodbye = { query: 'Goodbye' };
    const options = (currentDialog.options || []).concat(goodbye);

    el.style.display = 'block';

    // add multiple conversation options
    const optionHTML = Object.keys(options)
      .map(
        (i) => `<button class="option_button">${options[i].query}</button><br>`,
      )
      .join('');

    const html = `<p>
                 <b>${character.name}:</b>
                 ${response}
                </p>`;

    const buttonHTML = `<p>${optionHTML}</p>`;

    const finalHTML = html + buttonHTML;

    el.innerHTML = finalHTML;

    // add onclick functions to all buttons
    const buttons = el.querySelectorAll('button');
    Object.keys(options)
      .forEach((i) => {
        const button = buttons[i];
        button.addEventListener('click', () => {
          const option = options[i];
          if (option === goodbye || option.response == null) {
            updateConvo({ ...conversation, active: false });
            return;
          }
          updateConvo({
            ...conversation,
            currentDialog: option,
          });
        });
      });

    if (!conversation.active) {
      el.style.display = 'none';
    }
  },
};
