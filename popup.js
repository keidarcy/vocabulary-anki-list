const STORAGE_KEY = 'AnkiStorageKey';
const emptyEle = document.querySelector('.word-card');
const container = document.querySelector('.word-cards-container');
const overlay = document.querySelector('.modal-overlay');
const newWordForm = document.querySelector('[data-add-word-form]');
const iconBtn = document.querySelector('button.logo-img');
const overlayCloseBtn = document.querySelector('button[data-word-overlay-close]');
const memos = memoActions();
const shortcuts = shortcutsActions();

// ***************************** Events

window.addEventListener('DOMContentLoaded', memos.initialize, false);

document.body.addEventListener('keydown', shortcuts.handleKeyDown);

document.body.addEventListener('keyup', shortcuts.handleKeyUp);

iconBtn.addEventListener('click', memos.showAddOverlay);

newWordForm.addEventListener('submit', memos.addWord);

overlayCloseBtn.addEventListener('click', memos.hideAddOverlay);

// ********************************* Shortcuts Actions
function shortcutsActions() {
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
      if (keyMap.get('control') && keyMap.get('show') && e.key === 'Enter') {
        memos.hideAddOverlay();
        keyMap.set('show', false);
        return;
      }
      if (keyMap.get('control') && !keyMap.get('show') && e.key === 'Enter') {
        memos.showAddOverlay();
        keyMap.set('show', true);
        return;
      }
    }
  }

  function handleKeyUp(e) {
    if (e.key === 'Meta' || e.key === 'Control') {
      keyMap.delete('control');
    }
  }

  return {
    handleKeyDown,
    handleKeyUp,
  };
}

// ********************************* Memo Actions

function memoActions() {
  let wordsInList = [];
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
    const searchUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en_US/';
    const URL = searchUrl + word;
    this.lastElementChild.placeholder = 'searching...';

    if (wordsInList.find((w) => w.word === word)) {
      this.lastElementChild.value = `${word} existed`;
      setTimeout(() => {
        hideAddOverlay();
      }, 3000);
      return;
    }

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
          audio:
            phonetics.length && phonetics[0]?.audio
              ? `https:${phonetics[0]?.audio}`
              : undefined,
        };

        wordsInList.unshift(newWordData);
        _chromeSaveStorage(wordsInList);
        const div = document.createElement('div');
        div.innerHTML = _addWordUi(newWordData);
        if (phonetics.length && phonetics[0]?.audio) {
          _audioPlay(div.querySelector('[data-volume-icon]'));
        }
        _wordDelete(div.querySelector('[data-trash-icon]'));
        _dragItem(div.querySelector('[data-drag-icon]'), 0);
        if (container.firstElementChild.dataset.empty == 1) {
          container.replaceChildren(div);
        } else {
          container.prepend(div);
        }
        if (container.lastElementChild.dataset.empty == 1) {
          container.lastElementChild.remove();
        }
        hideAddOverlay();
      })
      .catch((err) => {
        console.error(err);
        this.lastElementChild.value = '';
        this.lastElementChild.placeholder = `Oops can\'t find ${word}`;
      });
  }

  function _chromeSaveStorage(list) {
    chrome.storage.sync.set({ AnkiStorageKey: list }, function () {
      console.log('new data saved', list);
    });
  }

  function _addWordUi(word) {
    return `<div class="flex word-card" draggable="false">
          <i class="fas fa-grip-vertical" data-drag-icon></i>
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
      wordsInList = wordsInList.filter((w) => w.word !== this.dataset.word);
      _chromeSaveStorage(wordsInList);
      this.closest('.word-card').remove();
      if (wordsInList.length === 0) {
        container.append(emptyEle);
      }
    });
  }

  function _dragItem(dragIcon, draggingIndex) {
    let after, afterIndex;
    const draggingElement = dragIcon.closest('.word-card');
    dragIcon.addEventListener('mouseenter', () => {
      draggingElement.setAttribute('draggable', true);
    });
    dragIcon.addEventListener('mouseleave', () => {
      draggingElement.setAttribute('draggable', false);
    });

    draggingElement.addEventListener('dragstart', () => {
      draggingElement.classList.add('dragging');
    });

    draggingElement.addEventListener('dragend', () => {
      draggingElement.classList.remove('dragging');
      container.insertBefore(draggingElement, after);
      _chromeSaveStorage(_move(draggingIndex, afterIndex, ...wordsInList));
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const { afterElement, index } = getDragAfterElement(e.clientY);
      if (afterElement) {
        after = afterElement;
        afterIndex = index;
      }
    });

    function getDragAfterElement(y) {
      const quiteWordList = [...document.querySelectorAll('.word-card:not(.dragging)')];
      const after = quiteWordList.reduce(
        (closest, child, index) => {
          const { top, height } = child.getBoundingClientRect();
          const offset = y - top - height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, afterElement: child, index };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY },
      );
      return after;
    }
  }

  function _handleWordUI() {
    const wordsHtml = wordsInList.map(_addWordUi).join('');
    container.innerHTML = wordsHtml;
  }

  function _handleItemDrag() {
    document.querySelectorAll('[data-drag-icon]').forEach(_dragItem);
  }

  function _handleAudiosPlay() {
    document.querySelectorAll('[data-volume-icon]').forEach(_audioPlay);
  }
  function _move(from, to, ...a) {
    return from === to ? a : (a.splice(to, 0, ...a.splice(from, 1)), a);
  }

  function _handleDeletion() {
    document.querySelectorAll('[data-trash-icon]').forEach(_wordDelete);
  }
  function initialize() {
    chrome.storage.sync.get(STORAGE_KEY, function (data) {
      if (!chrome.runtime.error) {
        wordsInList = data[STORAGE_KEY] || [];
        if (typeof wordsInList != 'object' || wordsInList.length === 0) return;

        _handleWordUI();
        _handleAudiosPlay();
        _handleDeletion();
        _handleItemDrag();
      }
    });
  }
  return {
    hideAddOverlay,
    showAddOverlay,
    addWord,
    initialize,
  };
}
