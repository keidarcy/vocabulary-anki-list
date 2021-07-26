const STORAGE_KEY = 'AnkiStorageKey';
let wordsInList;
const emptyEle = document.querySelector('.word-card');
const container = document.querySelector('.word-cards-container');
const newWordForm = document.querySelector('[data-add-word-form]');
const iconBtn = document.querySelector('button.logo-img');
const overlayCloseBtn = document.querySelector('button[data-word-overlay-close]');

const keyMap = new Map();

document.body.addEventListener('keydown', function (e) {
  if (
    e.key === 'Meta' ||
    e.key === 'Control' ||
    e.key === 'Backspace' ||
    e.key === 'Enter'
  ) {
    if (e.key === 'Meta' || e.key === 'Control') {
      keyMap.set('control', true);
    }
    if (keyMap.get('control') && e.key === 'Backspace') {
      hideAddOverlay();
    }
    if (keyMap.get('control') && e.key === 'Enter') {
      showAddOverlay();
    }
    return;
  }
});

document.body.addEventListener('keyup', function (e) {
  if (e.key === 'Meta' || e.key === 'Control') {
    keyMap.delete('control');
  }
});

iconBtn.addEventListener('click', showAddOverlay);

newWordForm.addEventListener('submit', addWord);

overlayCloseBtn.addEventListener('click', hideAddOverlay);

document.body.onload = function () {
  chrome.storage.sync.get(STORAGE_KEY, function (data) {
    if (!chrome.runtime.error) {
      wordsInList = data[STORAGE_KEY];
      if (typeof wordsInList != 'object' || wordsInList.length === 0) return;

      handleWordUI();
      handleAudio();
      handleDeletion();
    }
  });
};

function handleWordUI() {
  const wordsHtml = wordsInList
    .map((word) => {
      return `<div class="flex word-card">
					<div class="word-card-self">${word.word}</div>
					<div class="word-card-description">${word.description}</div>
					<div class="word-card-actions flex">
					${
            word.audio
              ? `<button data-volume-icon><i class="fa fa-volume-up"></i></button>
						<audio hidden>
							<source src=${word.audio} type="audio/mp3">
						</audio>`
              : ''
          }
						<button data-trash-icon data-word=${word.word}><i class="fa fa-trash-alt"></i></button>
					</div>
				</div>`;
    })
    .join('');
  container.innerHTML = wordsHtml;
}

function handleAudio() {
  [...document.querySelectorAll('[data-volume-icon]')].forEach((audioIcon, index) => {
    audioIcon.addEventListener('click', () => {
      document.getElementsByTagName('audio')[index].play();
    });
  });
}

function handleDeletion() {
  [...document.querySelectorAll('[data-trash-icon]')].forEach((trashBtn, index) => {
    trashBtn.addEventListener('click', function () {
      if (wordsInList.length === 0) {
        container.append(emptyEle);
      }
      const filtered = wordsInList.filter((w) => w.word !== this.dataset.word);
      wordsInList = filtered;
      chrome.storage.sync.set({ AnkiStorageKey: wordsInList }, function () {
        console.log('word deleted');
      });
      this.closest('.word-card').remove();
    });
  });
}

function addWord(e) {
  e.preventDefault();
  const word = this.firstElementChild.value.trim().replace(/[^a-zA-Z']/g, '');
  if (!word) return;
  searchAndSaveToStorage(word);
  hideAddOverlay();
  this.reset();

  function searchAndSaveToStorage(word) {
    const STORAGE_KEY = 'AnkiStorageKey';
    const searchUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en_US/';
    const URL = searchUrl + word;

    chrome.storage.sync.get(STORAGE_KEY, function (data) {
      console.log(data);
      let words = [];
      let existIndex = -1;
      if (data.hasOwnProperty(STORAGE_KEY)) {
        existIndex = data[STORAGE_KEY].findIndex((w) => w.word === word);
        words = data.AnkiStorageKey;
      }

      if (existIndex === -1) {
        fetch(URL)
          .then((rawRes) => rawRes.json())
          .then((res) => {
            if (res.length === undefined) return;
            const { meanings, phonetics } = res[0];
            const newWordData = {
              word,
              description: meanings.length
                ? meanings[0].definitions.length
                  ? meanings[0].definitions[0]?.definition
                  : undefined
                : undefined,
              audio: phonetics.length ? phonetics[0]?.audio : undefined
            };

            words.unshift(newWordData);

            chrome.storage.sync.set({ AnkiStorageKey: words }, function () {
              console.log('new Value set', words);
            });
          })
          .catch(console.error);
      }
    });
  }
}

function showAddOverlay() {
  newWordForm.classList.remove('hide');
  setTimeout(() => {
    newWordForm.querySelector('input').focus();
  }, 100);
}

function hideAddOverlay() {
  newWordForm.classList.add('hide');
}
