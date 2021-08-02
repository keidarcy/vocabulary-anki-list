const STORAGE_KEY = 'AnkiStorageKey';
const emptyEle = document.querySelector('.word-card');
const container = document.querySelector('.word-cards-container');
const overlay = document.querySelector('.modal-overlay');
const newWordForm = document.querySelector('[data-add-word-form]');
const iconBtn = document.querySelector('button.logo-img');
const overlayCloseBtn = document.querySelector('button[data-word-overlay-close]');
const memos = memoActions();
const shortCuts = shortCutsActions();

// ***************************** Events

window.addEventListener('DOMContentLoaded', memos.initialize, false);

document.body.addEventListener('keydown', shortCuts.handleKeyDown);

document.body.addEventListener('keyup', shortCuts.handleKeyUp);

iconBtn.addEventListener('click', memos.showAddOverlay);

newWordForm.addEventListener('submit', memos.addWord);

overlayCloseBtn.addEventListener('click', memos.hideAddOverlay);

// ********************************* shortCuts
function shortCutsActions() {
  const keyMap = new Map();
  function handleKeyDown(e) {
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
        memos.hideAddOverlay();
      }
      if (keyMap.get('control') && e.key === 'Enter') {
        memos.showAddOverlay();
      }
      return;
    }
  }

  function handleKeyUp(e) {
    if (e.key === 'Meta' || e.key === 'Control') {
      keyMap.delete('control');
    }
  }

  return {
    handleKeyDown,
    handleKeyUp
  };
}

// ********************************* Functions

function memoActions() {
  let wordsInList;
  function showAddOverlay() {
    overlay.classList.remove('hide');
    setTimeout(() => {
      newWordForm.querySelector('input').focus();
    }, 100);
  }
  function hideAddOverlay(e) {
    overlay.classList.add('hide');
    newWordForm.reset();
  }
  function addWord(e) {
    e.preventDefault();
    const word = this.lastElementChild.value.trim().replace(/[^a-zA-Z']/g, '');
    if (!word) return;

    // ********************* searchAndSaveToStorage

    const STORAGE_KEY = 'AnkiStorageKey';
    const searchUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en_US/';
    const URL = searchUrl + word;
    this.lastElementChild.value = 'searching...';

    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      let words = [];
      let existIndex = -1;
      if (data.hasOwnProperty(STORAGE_KEY)) {
        existIndex = data[STORAGE_KEY].findIndex((w) => w.word === word);
        words = data.AnkiStorageKey;
      }

      if (existIndex === -1) {
        fetch(URL)
          .then((rawRes) => {
            if (rawRes.ok) {
              return rawRes.json();
            } else {
              throw new Error('no word');
            }
          })
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
            const div = document.createElement('div');
            div.innerHTML = _addWordUi(newWordData);
            _audioPlay(div.querySelector('[data-volume-icon]'));
            _wordDelete(div.querySelector('[data-trash-icon]'));
            if (container.firstElementChild.dataset.empty == 1) {
              container.replaceChildren(div);
            } else {
              container.prepend(div);
            }
            hideAddOverlay();
          })
          .catch((err) => {
            console.error(err);
            this.lastElementChild.value = `Oops can\'t find ${word}`;
          });
      } else {
        this.lastElementChild.value = `${word} existed`;
        setTimeout(() => {
          hideAddOverlay();
        }, 3000);
      }
    });
  }

  function _addWordUi(word) {
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
  }

  function _audioPlay(audioBtn) {
    audioBtn.addEventListener('click', () => {
      audioBtn.nextElementSibling.play();
    });
  }
  function _wordDelete(trashBtn) {
    trashBtn.addEventListener('click', function () {
      const filtered = wordsInList.filter((w) => w.word !== this.dataset.word);
      wordsInList = filtered;
      chrome.storage.sync.set({ AnkiStorageKey: wordsInList }, function () {
        console.log('word deleted');
      });
      this.closest('.word-card').remove();
      if (wordsInList.length === 0) {
        container.append(emptyEle);
      }
    });
  }
  function _handleWordUI() {
    const wordsHtml = wordsInList.map(_addWordUi).join('');
    container.innerHTML = wordsHtml;
  }

  function _handleAudiosPlay() {
    document.querySelectorAll('[data-volume-icon]').forEach(_audioPlay);
  }

  function _handleDeletion() {
    document.querySelectorAll('[data-trash-icon]').forEach(_wordDelete);
  }
  function initialize() {
    chrome.storage.sync.get(STORAGE_KEY, function (data) {
      if (!chrome.runtime.error) {
        wordsInList = data[STORAGE_KEY];
        if (typeof wordsInList != 'object' || wordsInList.length === 0) return;

        _handleWordUI();
        _handleAudiosPlay();
        _handleDeletion();
      }
    });
  }
  return {
    hideAddOverlay,
    showAddOverlay,
    addWord,
    initialize
  };
}
