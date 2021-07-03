const STORAGE_KEY = 'AnkiStorageKey';

document.body.onload = function () {
  chrome.storage.sync.get(STORAGE_KEY, function (data) {
    if (!chrome.runtime.error) {
      const words = data[STORAGE_KEY];
      const container = document.querySelector('.word-cards-container');
      if (typeof words != 'object' || words.length === 0) {
        container.innerHTML = `
        <div class="flex word-card">
					<div class="word-card-self"></div>
					<div class="word-card-description">No vocabulary in anki memo yet</div>
					<div class="word-card-actions flex">
					</div>
				</div>
        `;
        return;
      }
      const wordsHtml = words
        .map((word) => {
          return `<div class="flex word-card">
					<div class="word-card-self">${word.word}</div>
					<div class="word-card-description">${word.description}</div>
					<div class="word-card-actions flex">
					${
            word.audio
              ? `<i class="js-volume-icon fa fa-volume-up icon-status-none"></i>
						<audio hidden>
							<source src=${word.audio} type="audio/mp3">
						</audio>`
              : ''
          }
						<i data-word=${word.word} class="js-delete-icon fa fa-trash-alt icon-status-none"></i>
					</div>
				</div>`;
        })
        .join('');
      container.innerHTML = wordsHtml;

      [...document.querySelectorAll('.js-volume-icon')].forEach((audioIcon, index) => {
        audioIcon.addEventListener('click', () => {
          document.getElementsByTagName('audio')[index].play();
        });
      });

      [...document.querySelectorAll('.js-delete-icon')].forEach((trashIcon, index) => {
        trashIcon.addEventListener('click', function () {
          if (this.classList.contains('icon-status-clicked')) {
            const filtered = words.filter((w) => w.word !== this.dataset.word);
            chrome.storage.sync.set({ AnkiStorageKey: filtered }, function () {
              console.log('word deleted');
            });
            this.closest('.word-card').classList.add('hide');
          } else {
            this.classList.replace('icon-status-none', 'icon-status-clicked');
          }
        });
      });
    }
  });
};
