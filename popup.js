const STORAGE_KEY = "AnkiStorageKey";
let wordsInList;
const emptyEle = document.querySelector(".word-card");
const container = document.querySelector(".word-cards-container");

document.body.onload = function () {
  chrome.storage.sync.get(STORAGE_KEY, function (data) {
    if (!chrome.runtime.error) {
      wordsInList = data[STORAGE_KEY];
      if (typeof wordsInList != "object" || wordsInList.length === 0) return;

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
              ? `<i class="js-volume-icon fa fa-volume-up icon-status-none"></i>
						<audio hidden>
							<source src=${word.audio} type="audio/mp3">
						</audio>`
              : ""
          }
						<i data-word=${
              word.word
            } class="js-delete-icon fa fa-trash-alt icon-status-none"></i>
					</div>
				</div>`;
    })
    .join("");
  container.innerHTML = wordsHtml;
}

function handleAudio() {
  [...document.querySelectorAll(".js-volume-icon")].forEach(
    (audioIcon, index) => {
      audioIcon.addEventListener("click", () => {
        document.getElementsByTagName("audio")[index].play();
      });
    }
  );
}

function handleDeletion() {
  [...document.querySelectorAll(".js-delete-icon")].forEach(
    (trashIcon, index) => {
      trashIcon.addEventListener("click", function () {
        if (this.classList.contains("icon-status-clicked")) {
          const filtered = wordsInList.filter(
            (w) => w.word !== this.dataset.word
          );
          wordsInList = filtered;
          chrome.storage.sync.set({ AnkiStorageKey: wordsInList }, function () {
            console.log("word deleted");
          });
          this.closest(".word-card").remove();
          if (wordsInList.length === 0) {
            container.append(emptyEle);
          }
        } else {
          this.classList.replace("icon-status-none", "icon-status-clicked");
        }
      });
    }
  );
}
