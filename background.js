const ANKI_COMMAND = 'anki-command';
const searchUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en_US/';

chrome.contextMenus.remove(ANKI_COMMAND, () => {
  chrome.contextMenus.create({
    id: ANKI_COMMAND,
    title: 'Add "%s" to Anki Memo',
    contexts: ['selection'] // ContextType
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == ANKI_COMMAND && typeof info.selectionText == 'string') {
    searchAndSaveToStorage(info.selectionText.trimStart().trimEnd().toLowerCase());
  }
});

function searchAndSaveToStorage(word) {
  const STORAGE_KEY = 'AnkiStorageKey';
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
            audio: phonetics.length ? `https:${phonetics[0]?.audio}` : undefined
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
